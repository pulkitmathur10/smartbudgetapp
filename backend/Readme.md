# Smart Budget API (Flask)

Single-user REST API with SQLite (`budget.db`).

## Setup

```bash
cd backend
pip install -r requirements.txt
python App.py
```

Server runs at `http://127.0.0.1:5000` by default.

On first start, tables are created and default **expense** categories (Groceries, Daily Needs, …) plus **income** categories (Salary, Other Income) are seeded.

## Main endpoints

| Area | Methods | Path |
|------|---------|------|
| Summary | GET | `/summary?month=&year=` — includes `investments_total`, `top_categories`, `monthly_trend` |
| Categories | GET, POST | `/categories` — optional `?kind=expense\|income` |
| Categories | PUT, DELETE | `/categories/<id>` |
| Income | GET, POST | `/income` — optional `?month=&year=` |
| Income | PUT, DELETE | `/income/<id>` |
| Expenses | GET, POST | `/expense` — optional `?month=&year=&category_id=` |
| Expenses | PUT, DELETE | `/expense/<id>` |
| Investments | GET, POST | `/investments` — `?include_transactions=1`; optional `premium_amount` + `premium_cadence` (`monthly` \| `yearly`) for planned SIP/premium-style flows (e.g. `mf`, `insurance`); optional `contributions_prior` = already invested before logged transactions |
| Investments | PUT, DELETE | `/investments/<id>` |
| Inv. tx | POST | `/investments/<id>/transactions` — body: `kind`, `amount`, `units`, `date`. `kind=valuation` sets holding `current_value` to `amount`. `kind=premium` logs an insurance/recurring premium payment. |
| Inventory | GET, POST | `/inventory` |
| Inventory | PUT, DELETE | `/inventory/<id>` |
| Reorder list | GET | `/inventory/reorder` |
| Purchase patterns | GET | `/inventory/patterns` — optional `?include_llm=1` (Vertex AI); habit-based stats from linked expenses, not consumption physics |
| Expense + inventory insight | POST | `/insights/expense` — body `{"expense_id": <id>}`; returns `llm_insight` (Vertex) or `hint` if disabled / error |
| Budgets | GET, POST | `/budgets` — `?month=&year=` |
| Budgets | PUT, DELETE | `/budgets/<id>` |
| Budget status | GET | `/budgets/status?month=&year=` |
| Recurring | GET, POST | `/recurring` |
| Recurring | PUT, DELETE | `/recurring/<id>` |
| Run due recurring | POST | `/recurring/run-now` |
| Full export | GET | `/export` |

### Inventory + expenses

When you **POST** `/expense` with `inventory_item_id` and `qty`, the linked item’s `current_qty` is **increased** by `qty` (purchase / restock), and `last_purchased_at` is set to the expense date.

### Vertex AI (optional prose)

Install deps (`google-cloud-aiplatform`). Enable only when you want Gemini-generated copy on patterns / expense insights.

| Variable | Example | Purpose |
|----------|---------|---------|
| `VERTEX_ENABLE` | `1` | Turn on LLM calls |
| `GOOGLE_CLOUD_PROJECT` or `VERTEX_PROJECT` | `my-gcp-project` | GCP project |
| `VERTEX_LOCATION` | `us-central1` | Vertex region |
| `VERTEX_MODEL` | `gemini-2.0-flash` | Model id |

Use **Application Default Credentials** (`gcloud auth application-default login` locally, or a service account JSON via `GOOGLE_APPLICATION_CREDENTIALS`). Enable the **Vertex AI API** on the project. Calls are billed per Vertex/Gemini pricing.

**`/inventory/patterns?include_llm=1`** runs one batched Gemini request and fills `llm_insight` per item; without the flag, only deterministic `hint` and stats are returned (no GCP needed).

### Recurring jobs

APScheduler runs a **daily** job (00:05) to create `Income` / `Expense` rows for due `RecurringTransaction` rows and advance `next_run`.

### Import stubs (mobile / notifications)

Normalized JSON creates an expense (category from `category_hint` name match, else **Other**):

```
POST /import/swiggy
POST /import/zomato
POST /import/sms
```

**Body:**

```json
{
  "amount": 249.5,
  "merchant": "Swiggy",
  "raw": "optional raw notification text",
  "ts": "2026-05-01T12:00:00",
  "category_hint": "Eating Out"
}
```

The `source` field is set automatically from the path. Traceability is stored in `notes` and `payment_method`.

CORS is enabled for local dev (e.g. Vite on another port).

## Fresh database

Delete `budget.db` and restart to recreate schema and re-seed categories.
