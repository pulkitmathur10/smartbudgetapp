"""Purchase rhythm from expenses linked to inventory items (deterministic)."""
from __future__ import annotations

import statistics
from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from models import Expense, InventoryItem


def _merge_expenses_by_day(expenses: list[Expense]) -> list[dict[str, Any]]:
    """One event per calendar day: summed qty and amount."""
    by_day: dict[date, dict[str, Any]] = {}
    for e in sorted(expenses, key=lambda x: (x.date, x.id or 0)):
        d = e.date
        if d not in by_day:
            by_day[d] = {"date": d, "qty": 0.0, "amount": 0.0}
        by_day[d]["qty"] += float(e.qty or 0)
        by_day[d]["amount"] += float(e.amount or 0)
    return [by_day[k] for k in sorted(by_day.keys())]


def _hint_for_pattern(
    status: str,
    name: str,
    median_days: float | None,
    last_d: date | None,
    suggested: date | None,
    days_until: int | None,
    reorder_low: bool,
) -> str:
    if status == "no_linked_purchases":
        return f'No purchases linked to "{name}" yet—log expenses with this item to see rhythm.'
    if status == "single_purchase":
        return f'One linked purchase day for "{name}"; add more history to estimate a repurchase rhythm.'
    if status == "insufficient_intervals":
        return f'Early pattern for "{name}"—only one gap between purchase days so far; keep logging linked buys.'
    # active
    parts = [f'"{name}" is typically restocked about every {int(round(median_days))} days based on your linked purchases.']
    if last_d:
        parts.append(f"Last linked purchase on {last_d.isoformat()}.")
    if suggested is not None:
        parts.append(f"At that pace, a similar restock might land around {suggested.isoformat()}.")
    if days_until is not None:
        if days_until < 0:
            parts.append(f"That target date was {abs(days_until)} day(s) ago (habit-based, not a forecast of stock).")
        elif days_until == 0:
            parts.append("That lines up with today—worth a quick check if you still need this item.")
        else:
            parts.append(f"About {days_until} day(s) until that habit-based date.")
    if reorder_low:
        parts.append("On-hand qty is at or below your reorder threshold.")
    return " ".join(parts)


def compute_pattern_for_item(item: InventoryItem, linked_expenses: list[Expense]) -> dict[str, Any]:
    events = _merge_expenses_by_day(linked_expenses) if linked_expenses else []
    n_days = len(events)
    linked_count = len(linked_expenses)

    base: dict[str, Any] = {
        "inventory_item_id": item.id,
        "name": item.name,
        "unit": item.unit,
        "current_qty": float(item.current_qty or 0),
        "reorder_threshold": float(item.reorder_threshold or 0),
        "linked_expense_count": linked_count,
        "purchase_event_count": n_days,
        "median_interval_days": None,
        "mean_interval_days": None,
        "first_purchase_date": None,
        "last_purchase_date": None,
        "suggested_next_purchase_date": None,
        "days_until_suggested": None,
        "is_overdue_vs_pattern": False,
        "pattern_status": "no_linked_purchases",
        "hint": "",
        "llm_insight": None,
    }

    reorder_low = float(item.current_qty or 0) <= float(item.reorder_threshold or 0)

    if n_days == 0:
        base["pattern_status"] = "no_linked_purchases"
        base["hint"] = _hint_for_pattern("no_linked_purchases", item.name, None, None, None, None, reorder_low)
        return base

    first_d = events[0]["date"]
    last_d = events[-1]["date"]
    base["first_purchase_date"] = first_d.isoformat()
    base["last_purchase_date"] = last_d.isoformat()

    if n_days == 1:
        base["pattern_status"] = "single_purchase"
        base["hint"] = _hint_for_pattern("single_purchase", item.name, None, last_d, None, None, reorder_low)
        return base

    intervals = [(events[i]["date"] - events[i - 1]["date"]).days for i in range(1, n_days)]
    mean_iv = float(statistics.mean(intervals))
    base["mean_interval_days"] = round(mean_iv, 1)

    if n_days == 2:
        base["pattern_status"] = "insufficient_intervals"
        base["hint"] = _hint_for_pattern(
            "insufficient_intervals", item.name, None, last_d, None, None, reorder_low
        )
        return base

    # n_days >= 3 -> at least 2 intervals
    median_iv = float(statistics.median(intervals))
    base["median_interval_days"] = round(median_iv, 1)
    base["pattern_status"] = "active"

    suggested = last_d + timedelta(days=int(round(median_iv)))
    base["suggested_next_purchase_date"] = suggested.isoformat()
    today = date.today()
    days_until = (suggested - today).days
    base["days_until_suggested"] = days_until
    base["is_overdue_vs_pattern"] = suggested < today

    base["hint"] = _hint_for_pattern(
        "active", item.name, median_iv, last_d, suggested, days_until, reorder_low
    )
    return base


def build_all_inventory_patterns(session) -> list[dict[str, Any]]:
    """All inventory rows with pattern stats (no LLM)."""
    items = session.query(InventoryItem).order_by(InventoryItem.name).all()
    exps = (
        session.query(Expense)
        .filter(Expense.inventory_item_id.isnot(None))
        .order_by(Expense.date, Expense.id)
        .all()
    )
    by_item: dict[int, list[Expense]] = defaultdict(list)
    for e in exps:
        by_item[e.inventory_item_id].append(e)

    out: list[dict[str, Any]] = []
    for item in items:
        out.append(compute_pattern_for_item(item, by_item.get(item.id, [])))
    return out


def compute_pattern_dict_for_item_id(session, item_id: int) -> dict[str, Any] | None:
    item = session.get(InventoryItem, item_id)
    if not item:
        return None
    exps = (
        session.query(Expense)
        .filter(Expense.inventory_item_id == item_id)
        .order_by(Expense.date, Expense.id)
        .all()
    )
    return compute_pattern_for_item(item, exps)
