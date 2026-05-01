import os
from datetime import date, datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from dateutil.relativedelta import relativedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_migrate import Migrate
from sqlalchemy import extract, func, inspect, text

from models import (
    Budget,
    Category,
    Expense,
    Income,
    InventoryItem,
    Investment,
    InvestmentTransaction,
    RecurringTransaction,
    db,
)
from schemas import (
    BudgetSchema,
    CategorySchema,
    ExpenseSchema,
    ImportPayloadSchema,
    IncomeSchema,
    InventoryItemSchema,
    InvestmentSchema,
    InvestmentTransactionSchema,
    RecurringTransactionSchema,
)

DEFAULT_EXPENSE_CATEGORIES = [
    "Groceries",
    "Daily Needs",
    "Clothing",
    "Home",
    "Transport",
    "Rent",
    "Utilities",
    "Eating Out",
    "Subscriptions",
    "Other",
]


def seed_default_categories():
    if Category.query.first() is not None:
        return
    for name in DEFAULT_EXPENSE_CATEGORIES:
        db.session.add(Category(name=name, parent_id=None, kind="expense"))
    db.session.add(Category(name="Salary", parent_id=None, kind="income"))
    db.session.add(Category(name="Other Income", parent_id=None, kind="income"))
    db.session.commit()


def apply_inventory_from_expense(expense):
    """Linking an expense to inventory with qty records a purchase: stock increases."""
    if not expense.inventory_item_id or expense.qty is None:
        return
    item = db.session.get(InventoryItem, expense.inventory_item_id)
    if not item:
        return
    item.current_qty = (item.current_qty or 0) + float(expense.qty)
    item.last_purchased_at = expense.date


def process_recurring_due():
    today = date.today()
    recs = RecurringTransaction.query.filter(
        RecurringTransaction.is_active.is_(True),
        RecurringTransaction.next_run <= today,
    ).all()
    for r in recs:
        while r.next_run <= today:
            if r.kind == "income":
                db.session.add(
                    Income(
                        amount=r.amount,
                        source=r.source or "Recurring",
                        date=r.next_run,
                        category_id=r.category_id,
                        notes=r.notes,
                    )
                )
            else:
                db.session.add(
                    Expense(
                        amount=r.amount,
                        date=r.next_run,
                        category_id=r.category_id,
                        notes=r.notes,
                    )
                )
            r.last_run = r.next_run
            if r.cadence == "monthly":
                r.next_run = r.next_run + relativedelta(months=1)
            else:
                r.next_run = r.next_run + timedelta(weeks=1)
    if recs:
        db.session.commit()


def ensure_investment_premium_columns(engine):
    """SQLite: add investment columns if DB predates those fields."""
    try:
        insp = inspect(engine)
        if not insp.has_table("investments"):
            return
        cols = {c["name"] for c in insp.get_columns("investments")}
    except Exception:
        return
    with engine.begin() as conn:
        if "premium_amount" not in cols:
            conn.execute(text("ALTER TABLE investments ADD COLUMN premium_amount FLOAT"))
        if "premium_cadence" not in cols:
            conn.execute(text("ALTER TABLE investments ADD COLUMN premium_cadence VARCHAR(16)"))
        if "contributions_prior" not in cols:
            conn.execute(text("ALTER TABLE investments ADD COLUMN contributions_prior FLOAT"))


def resolve_category_id_from_hint(hint, kind="expense"):
    if not hint:
        return None
    c = (
        Category.query.filter(
            Category.name.ilike(hint.strip()),
            Category.kind == kind,
        )
        .first()
    )
    return c.id if c else None


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///budget.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    Migrate(app, db)
    CORS(app)

    with app.app_context():
        db.create_all()
        ensure_investment_premium_columns(db.engine)
        seed_default_categories()

    def scheduled_recurring():
        with app.app_context():
            try:
                process_recurring_due()
            except Exception as e:  # noqa: BLE001
                app.logger.exception("recurring job failed: %s", e)

    scheduler = BackgroundScheduler()
    scheduler.add_job(scheduled_recurring, "cron", hour=0, minute=5, id="recurring_materialize")
    if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        scheduler.start()
        import atexit

        atexit.register(lambda: scheduler.shutdown(wait=False))

    # Schemas
    category_schema = CategorySchema()
    categories_schema = CategorySchema(many=True)
    income_schema = IncomeSchema()
    incomes_schema = IncomeSchema(many=True)
    income_schema_partial = IncomeSchema(partial=True)
    expense_schema = ExpenseSchema()
    expenses_schema = ExpenseSchema(many=True)
    expense_schema_partial = ExpenseSchema(partial=True)
    investment_schema = InvestmentSchema()
    investments_schema = InvestmentSchema(many=True)
    investment_schema_partial = InvestmentSchema(partial=True)
    inv_tx_schema = InvestmentTransactionSchema()
    inventory_schema = InventoryItemSchema()
    inventories_schema = InventoryItemSchema(many=True)
    inventory_schema_partial = InventoryItemSchema(partial=True)
    budget_schema = BudgetSchema()
    budgets_schema = BudgetSchema(many=True)
    budget_schema_partial = BudgetSchema(partial=True)
    recurring_schema = RecurringTransactionSchema()
    recurrings_schema = RecurringTransactionSchema(many=True)
    recurring_schema_partial = RecurringTransactionSchema(partial=True)
    import_schema = ImportPayloadSchema()

    # --- Categories ---
    @app.route("/categories", methods=["GET"])
    def list_categories():
        q = Category.query
        kind = request.args.get("kind")
        if kind:
            q = q.filter(Category.kind == kind)
        return jsonify(categories_schema.dump(q.order_by(Category.name).all()))

    @app.route("/categories", methods=["POST"])
    def create_category():
        data = category_schema.load(request.json)
        c = Category(**data)
        db.session.add(c)
        db.session.commit()
        return jsonify(category_schema.dump(c)), 201

    @app.route("/categories/<int:cid>", methods=["PUT"])
    def update_category(cid):
        c = Category.query.get_or_404(cid)
        data = category_schema.load(request.json, partial=True)
        for k, v in data.items():
            setattr(c, k, v)
        db.session.commit()
        return jsonify(category_schema.dump(c))

    @app.route("/categories/<int:cid>", methods=["DELETE"])
    def delete_category(cid):
        c = Category.query.get_or_404(cid)
        db.session.delete(c)
        db.session.commit()
        return "", 204

    # --- Income ---
    def income_query():
        q = Income.query
        month = request.args.get("month", type=int)
        year = request.args.get("year", type=int)
        if month is not None:
            q = q.filter(extract("month", Income.date) == month)
        if year is not None:
            q = q.filter(extract("year", Income.date) == year)
        return q

    @app.route("/income", methods=["POST"])
    def add_income():
        data = income_schema.load(request.json)
        inc = Income(**data)
        db.session.add(inc)
        db.session.commit()
        return jsonify(income_schema.dump(inc)), 201

    @app.route("/income", methods=["GET"])
    def get_incomes():
        all_inc = income_query().order_by(Income.date.desc()).all()
        return jsonify(incomes_schema.dump(all_inc))

    @app.route("/income/<int:iid>", methods=["PUT"])
    def update_income(iid):
        inc = Income.query.get_or_404(iid)
        data = income_schema_partial.load(request.json)
        for k, v in data.items():
            setattr(inc, k, v)
        db.session.commit()
        return jsonify(income_schema.dump(inc))

    @app.route("/income/<int:iid>", methods=["DELETE"])
    def delete_income(iid):
        inc = Income.query.get_or_404(iid)
        db.session.delete(inc)
        db.session.commit()
        return "", 204

    # --- Expense ---
    def expense_query():
        q = Expense.query
        month = request.args.get("month", type=int)
        year = request.args.get("year", type=int)
        category_id = request.args.get("category_id", type=int)
        if month is not None:
            q = q.filter(extract("month", Expense.date) == month)
        if year is not None:
            q = q.filter(extract("year", Expense.date) == year)
        if category_id is not None:
            q = q.filter(Expense.category_id == category_id)
        return q

    @app.route("/expense", methods=["POST"])
    def add_expense():
        data = expense_schema.load(request.json)
        exp = Expense(**data)
        db.session.add(exp)
        apply_inventory_from_expense(exp)
        db.session.commit()
        return jsonify(expense_schema.dump(exp)), 201

    @app.route("/expense", methods=["GET"])
    def get_expenses():
        all_exp = expense_query().order_by(Expense.date.desc()).all()
        return jsonify(expenses_schema.dump(all_exp))

    @app.route("/expense/<int:eid>", methods=["PUT"])
    def update_expense(eid):
        exp = Expense.query.get_or_404(eid)
        data = expense_schema_partial.load(request.json)
        for k, v in data.items():
            setattr(exp, k, v)
        db.session.commit()
        return jsonify(expense_schema.dump(exp))

    @app.route("/expense/<int:eid>", methods=["DELETE"])
    def delete_expense(eid):
        exp = Expense.query.get_or_404(eid)
        db.session.delete(exp)
        db.session.commit()
        return "", 204

    # --- Investments ---
    @app.route("/investments", methods=["GET"])
    def list_investments():
        invs = Investment.query.order_by(Investment.name).all()
        if request.args.get("include_transactions") == "1":
            for inv in invs:
                _ = inv.transactions.all()  # preload
        return jsonify(investments_schema.dump(invs))

    @app.route("/investments", methods=["POST"])
    def create_investment():
        data = investment_schema.load(request.json, partial=("transactions",))
        data.pop("transactions", None)
        inv = Investment(**data)
        db.session.add(inv)
        db.session.commit()
        return jsonify(investment_schema.dump(inv)), 201

    @app.route("/investments/<int:iid>", methods=["PUT"])
    def update_investment(iid):
        inv = Investment.query.get_or_404(iid)
        data = investment_schema_partial.load(request.json)
        data.pop("transactions", None)
        for k, v in data.items():
            setattr(inv, k, v)
        db.session.commit()
        return jsonify(investment_schema.dump(inv))

    @app.route("/investments/<int:iid>", methods=["DELETE"])
    def delete_investment(iid):
        inv = Investment.query.get_or_404(iid)
        db.session.delete(inv)
        db.session.commit()
        return "", 204

    @app.route("/investments/<int:iid>/transactions", methods=["POST"])
    def add_investment_transaction(iid):
        Investment.query.get_or_404(iid)
        body = request.json or {}
        body["investment_id"] = iid
        data = inv_tx_schema.load(body)
        data.pop("investment_id", None)
        tx = InvestmentTransaction(investment_id=iid, **data)
        db.session.add(tx)
        inv = db.session.get(Investment, iid)
        if data["kind"] == "valuation":
            inv.current_value = float(data["amount"])
        db.session.commit()
        return jsonify(inv_tx_schema.dump(tx)), 201

    # --- Inventory ---
    @app.route("/inventory", methods=["GET"])
    def list_inventory():
        items = InventoryItem.query.order_by(InventoryItem.name).all()
        return jsonify(inventories_schema.dump(items))

    @app.route("/inventory", methods=["POST"])
    def create_inventory():
        data = inventory_schema.load(request.json)
        item = InventoryItem(**data)
        db.session.add(item)
        db.session.commit()
        return jsonify(inventory_schema.dump(item)), 201

    @app.route("/inventory/<int:iid>", methods=["PUT"])
    def update_inventory(iid):
        item = InventoryItem.query.get_or_404(iid)
        data = inventory_schema_partial.load(request.json)
        for k, v in data.items():
            setattr(item, k, v)
        db.session.commit()
        return jsonify(inventory_schema.dump(item))

    @app.route("/inventory/<int:iid>", methods=["DELETE"])
    def delete_inventory(iid):
        item = InventoryItem.query.get_or_404(iid)
        db.session.delete(item)
        db.session.commit()
        return "", 204

    @app.route("/inventory/reorder", methods=["GET"])
    def inventory_reorder():
        items = (
            InventoryItem.query.filter(InventoryItem.current_qty <= InventoryItem.reorder_threshold)
            .order_by(InventoryItem.name)
            .all()
        )
        return jsonify(inventories_schema.dump(items))

    # --- Budgets ---
    @app.route("/budgets", methods=["GET"])
    def list_budgets():
        month = request.args.get("month", type=int)
        year = request.args.get("year", type=int)
        q = Budget.query
        if month is not None:
            q = q.filter(Budget.month == month)
        if year is not None:
            q = q.filter(Budget.year == year)
        return jsonify(budgets_schema.dump(q.all()))

    @app.route("/budgets", methods=["POST"])
    def create_budget():
        data = budget_schema.load(request.json)
        b = Budget(**data)
        db.session.add(b)
        db.session.commit()
        return jsonify(budget_schema.dump(b)), 201

    @app.route("/budgets/<int:bid>", methods=["PUT"])
    def update_budget(bid):
        b = Budget.query.get_or_404(bid)
        data = budget_schema_partial.load(request.json)
        for k, v in data.items():
            setattr(b, k, v)
        db.session.commit()
        return jsonify(budget_schema.dump(b))

    @app.route("/budgets/<int:bid>", methods=["DELETE"])
    def delete_budget(bid):
        b = Budget.query.get_or_404(bid)
        db.session.delete(b)
        db.session.commit()
        return "", 204

    @app.route("/budgets/status", methods=["GET"])
    def budgets_status():
        month = request.args.get("month", date.today().month, type=int)
        year = request.args.get("year", date.today().year, type=int)
        budgets = Budget.query.filter(Budget.month == month, Budget.year == year).all()
        rows = []
        any_over = False
        for b in budgets:
            spent = (
                db.session.query(func.coalesce(func.sum(Expense.amount), 0.0))
                .filter(
                    Expense.category_id == b.category_id,
                    extract("month", Expense.date) == month,
                    extract("year", Expense.date) == year,
                )
                .scalar()
            )
            spent = float(spent or 0)
            limit_amt = float(b.limit_amount)
            pct = (spent / limit_amt * 100) if limit_amt else 0
            over = spent > limit_amt
            if over:
                any_over = True
            cat_name = b.category.name if b.category else ""
            rows.append(
                {
                    "budget_id": b.id,
                    "category_id": b.category_id,
                    "category_name": cat_name,
                    "limit": limit_amt,
                    "spent": spent,
                    "pct": round(pct, 2),
                    "over_budget": over,
                }
            )
        return jsonify({"items": rows, "any_over_budget": any_over})

    # --- Recurring ---
    @app.route("/recurring", methods=["GET"])
    def list_recurring():
        items = RecurringTransaction.query.order_by(RecurringTransaction.next_run).all()
        return jsonify(recurrings_schema.dump(items))

    @app.route("/recurring", methods=["POST"])
    def create_recurring():
        data = recurring_schema.load(request.json)
        r = RecurringTransaction(**data)
        db.session.add(r)
        db.session.commit()
        return jsonify(recurring_schema.dump(r)), 201

    @app.route("/recurring/<int:rid>", methods=["PUT"])
    def update_recurring(rid):
        r = RecurringTransaction.query.get_or_404(rid)
        data = recurring_schema_partial.load(request.json)
        for k, v in data.items():
            setattr(r, k, v)
        db.session.commit()
        return jsonify(recurring_schema.dump(r))

    @app.route("/recurring/<int:rid>", methods=["DELETE"])
    def delete_recurring(rid):
        r = RecurringTransaction.query.get_or_404(rid)
        db.session.delete(r)
        db.session.commit()
        return "", 204

    @app.route("/recurring/run-now", methods=["POST"])
    def run_recurring_now():
        """Dev/helper: materialize due recurring rows immediately."""
        process_recurring_due()
        return jsonify({"ok": True})

    # --- Summary (extended) ---
    @app.route("/summary", methods=["GET"])
    def get_summary():
        month = request.args.get("month", date.today().month, type=int)
        year = request.args.get("year", date.today().year, type=int)

        total_inc = (
            db.session.query(func.coalesce(func.sum(Income.amount), 0.0))
            .filter(extract("month", Income.date) == month, extract("year", Income.date) == year)
            .scalar()
        )
        total_exp = (
            db.session.query(func.coalesce(func.sum(Expense.amount), 0.0))
            .filter(extract("month", Expense.date) == month, extract("year", Expense.date) == year)
            .scalar()
        )
        total_inc = float(total_inc or 0)
        total_exp = float(total_exp or 0)

        investments_total = (
            db.session.query(func.coalesce(func.sum(Investment.current_value), 0.0)).scalar() or 0.0
        )
        investments_total = float(investments_total)

        top_q = (
            db.session.query(Category.name, func.sum(Expense.amount).label("s"))
            .join(Expense, Expense.category_id == Category.id)
            .filter(
                extract("month", Expense.date) == month,
                extract("year", Expense.date) == year,
            )
            .group_by(Category.id, Category.name)
            .order_by(func.sum(Expense.amount).desc())
            .limit(8)
            .all()
        )
        top_categories = [{"name": n, "amount": float(s or 0)} for n, s in top_q]

        monthly_trend = []
        cursor = date(year, month, 1) + relativedelta(months=-5)
        for _ in range(6):
            m, y = cursor.month, cursor.year
            inc_m = (
                db.session.query(func.coalesce(func.sum(Income.amount), 0.0))
                .filter(extract("month", Income.date) == m, extract("year", Income.date) == y)
                .scalar()
            )
            exp_m = (
                db.session.query(func.coalesce(func.sum(Expense.amount), 0.0))
                .filter(extract("month", Expense.date) == m, extract("year", Expense.date) == y)
                .scalar()
            )
            monthly_trend.append(
                {
                    "month": m,
                    "year": y,
                    "label": f"{y}-{m:02d}",
                    "income": float(inc_m or 0),
                    "expenses": float(exp_m or 0),
                }
            )
            cursor = cursor + relativedelta(months=1)

        balance = total_inc - total_exp
        return jsonify(
            {
                "income": total_inc,
                "expenses": total_exp,
                "balance": balance,
                "investments_total": investments_total,
                "top_categories": top_categories,
                "monthly_trend": monthly_trend,
            }
        )

    # --- Export ---
    @app.route("/export", methods=["GET"])
    def export_all():
        incomes = Income.query.order_by(Income.date.desc()).all()
        expenses = Expense.query.order_by(Expense.date.desc()).all()
        categories = Category.query.all()
        investments = Investment.query.all()
        inventory = InventoryItem.query.all()
        budgets = Budget.query.all()
        recurring = RecurringTransaction.query.all()
        inv_tx = InvestmentTransaction.query.order_by(InvestmentTransaction.date.desc()).all()
        inv_tx_many = InvestmentTransactionSchema(many=True)
        return jsonify(
            {
                "exported_at": datetime.utcnow().isoformat() + "Z",
                "categories": categories_schema.dump(categories),
                "incomes": incomes_schema.dump(incomes),
                "expenses": expenses_schema.dump(expenses),
                "investments": investments_schema.dump(investments),
                "investment_transactions": inv_tx_many.dump(inv_tx),
                "inventory": inventories_schema.dump(inventory),
                "budgets": budgets_schema.dump(budgets),
                "recurring": recurrings_schema.dump(recurring),
            }
        )

    # --- Import stubs ---
    def handle_import(source: str):
        body = dict(request.json or {})
        body["source"] = source
        payload = import_schema.load(body)
        exp_date = payload["ts"].date() if payload.get("ts") else date.today()
        cat_id = resolve_category_id_from_hint(payload.get("category_hint"), "expense")
        if cat_id is None:
            other = Category.query.filter(Category.name == "Other", Category.kind == "expense").first()
            cat_id = other.id if other else None
        notes_parts = [
            f"[import:{payload['source']}]",
            f"merchant={payload.get('merchant')}",
        ]
        if payload.get("raw"):
            notes_parts.append(f"raw={payload['raw'][:500]}")
        exp = Expense(
            amount=payload["amount"],
            date=exp_date,
            category_id=cat_id,
            notes=" ".join(notes_parts),
            payment_method=payload["source"],
        )
        db.session.add(exp)
        db.session.commit()
        return jsonify(expense_schema.dump(exp)), 201

    @app.route("/import/swiggy", methods=["POST"])
    def import_swiggy():
        return handle_import("swiggy")

    @app.route("/import/zomato", methods=["POST"])
    def import_zomato():
        return handle_import("zomato")

    @app.route("/import/sms", methods=["POST"])
    def import_sms():
        return handle_import("sms")

    return app


if __name__ == "__main__":
    application = create_app()
    application.run(debug=True)
