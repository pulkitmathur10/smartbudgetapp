"""Optional Vertex AI (Gemini) prose for inventory patterns and expense context."""
from __future__ import annotations

import json
import logging
import os
import re
from typing import Any
from google.auth.credentials import AnonymousCredentials
from google.oauth2.credentials import Credentials

logger = logging.getLogger(__name__)

_vertex_initialized = False


def vertex_llm_enabled() -> bool:
    if os.environ.get("VERTEX_ENABLE", "").strip().lower() not in ("1", "true", "yes"):
        return False
    project = (
        os.environ.get("GOOGLE_CLOUD_PROJECT")
        or os.environ.get("GCP_PROJECT")
        or os.environ.get("VERTEX_PROJECT")
        or ""
    ).strip()
    return bool(project)


def _vertex_location() -> str:
    return (os.environ.get("VERTEX_LOCATION") or "us-central1").strip()


def _vertex_model() -> str:
    return (os.environ.get("VERTEX_MODEL") or "gemini-2.0-flash").strip()


def _ensure_vertex_init() -> tuple[str, str] | None:
    global _vertex_initialized
    if not vertex_llm_enabled():
        return None

    project = os.environ.get("VERTEX_PROJECT") or os.environ.get("GOOGLE_CLOUD_PROJECT") or ""
    location = _vertex_location()
    token = os.environ.get("VERTEX_TOKEN", "").strip() # New Env Var

    try:
        import vertexai
        if not _vertex_initialized:
            # If a token is provided, wrap it in a Credentials object
            credentials = None
            if token:
                credentials = Credentials(token)
            
            # Pass the credentials object directly to init
            vertexai.init(project=project, location=location, credentials=credentials)
            _vertex_initialized = True
    except Exception as e:
        logger.exception("Vertex init failed: %s", e)
        return None
    return project, location


def _extract_json_object(text: str) -> dict[str, Any] | None:
    text = (text or "").strip()
    if not text:
        return None
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None
    return None


def attach_llm_insights_to_patterns(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Mutates copies: sets llm_insight per row from one batched Gemini call (JSON response)."""
    out = []
    for row in items:
        r = dict(row)
        r.setdefault("llm_insight", None)
        out.append(r)

    if not vertex_llm_enabled() or not out:
        return out

    if _ensure_vertex_init() is None:
        return out

    try:
        from vertexai.generative_models import GenerationConfig, GenerativeModel
    except ImportError:
        logger.warning("vertexai not installed; skip LLM")
        return out

    payload = []
    for r in out:
        payload.append(
            {
                "inventory_item_id": r["inventory_item_id"],
                "name": r["name"],
                "unit": r["unit"],
                "current_qty": r["current_qty"],
                "reorder_threshold": r["reorder_threshold"],
                "pattern_status": r["pattern_status"],
                "purchase_event_count": r["purchase_event_count"],
                "median_interval_days": r["median_interval_days"],
                "last_purchase_date": r["last_purchase_date"],
                "suggested_next_purchase_date": r["suggested_next_purchase_date"],
                "days_until_suggested": r["days_until_suggested"],
                "hint": r["hint"],
            }
        )

    system = (
        "You are a concise household budgeting assistant. "
        "You do not give financial, legal, or tax advice. "
        "Purchase intervals are habit-based from past linked expenses, not predictions of stock depletion. "
        "Respond with ONLY valid JSON, no markdown outside the JSON object."
    )
    user = (
        "For each inventory item below, write a short insight (max 350 characters each) in plain language. "
        'Return JSON exactly in this shape: {"insights":[{"inventory_item_id":<int>,"text":"<string>"},...]} '
        "Include every inventory_item_id from the input in the same order as given.\n\nINPUT:\n"
        + json.dumps(payload, indent=2)
    )

    try:
        model = GenerativeModel(_vertex_model())
        raw = ""
        data = None
        for use_json_mime in (True, False):
            try:
                gen_kw: dict[str, Any] = dict(temperature=0.4, max_output_tokens=2048)
                if use_json_mime:
                    gen_kw["response_mime_type"] = "application/json"
                gen_cfg = GenerationConfig(**gen_kw)
                resp = model.generate_content(
                    [system, user],
                    generation_config=gen_cfg,
                )
                raw = ""
                if resp.candidates:
                    for part in resp.candidates[0].content.parts:
                        if hasattr(part, "text") and part.text:
                            raw += part.text
                if raw.strip().startswith("{"):
                    try:
                        data = json.loads(raw)
                    except json.JSONDecodeError:
                        data = _extract_json_object(raw)
                else:
                    data = _extract_json_object(raw)
                if data and "insights" in data:
                    break
            except Exception as inner:  # noqa: BLE001
                logger.debug("Vertex batch attempt (json_mime=%s): %s", use_json_mime, inner)
                data = None
                continue
        if not data or "insights" not in data:
            logger.warning("Vertex response missing insights: %s", raw[:500])
            return out
        by_id = {int(x["inventory_item_id"]): x.get("text") or "" for x in data["insights"] if "inventory_item_id" in x}
        for r in out:
            tid = int(r["inventory_item_id"])
            if tid in by_id and by_id[tid].strip():
                r["llm_insight"] = by_id[tid].strip()
    except Exception as e:  # noqa: BLE001
        logger.exception("Vertex batch insight failed: %s", e)

    return out


def generate_expense_inventory_insight(
    expense_summary: dict[str, Any],
    pattern_summary: dict[str, Any] | None,
) -> str | None:
    """Single expense + optional item pattern; returns plain text or None."""
    if not vertex_llm_enabled():
        return None
    if _ensure_vertex_init() is None:
        return None

    try:
        from vertexai.generative_models import GenerationConfig, GenerativeModel
    except ImportError:
        return None

    system = (
        "You are a concise household budgeting assistant. "
        "No financial, legal, or tax advice. "
        "Linked inventory reflects restock habits from past data, not guaranteed future behavior. "
        "Reply with plain text only, 2–4 short sentences, no JSON."
    )
    user = "EXPENSE:\n" + json.dumps(expense_summary, indent=2)
    if pattern_summary:
        user += "\n\nINVENTORY_PATTERN:\n" + json.dumps(pattern_summary, indent=2)

    try:
        model = GenerativeModel(_vertex_model())
        resp = model.generate_content(
            [system, user],
            generation_config=GenerationConfig(temperature=0.4, max_output_tokens=512),
        )
        raw = ""
        if resp.candidates:
            for part in resp.candidates[0].content.parts:
                if hasattr(part, "text") and part.text:
                    raw += part.text
        text = (raw or "").strip()
        return text or None
    except Exception as e:  # noqa: BLE001
        logger.exception("Vertex expense insight failed: %s", e)
        return None
