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
| Budgets | GET, POST | `/budgets` — `?month=&year=` |
| Budgets | PUT, DELETE | `/budgets/<id>` |
| Budget status | GET | `/budgets/status?month=&year=` |
| Recurring | GET, POST | `/recurring` |
| Recurring | PUT, DELETE | `/recurring/<id>` |
| Run due recurring | POST | `/recurring/run-now` |
| Full export | GET | `/export` |

### Inventory + expenses

When you **POST** `/expense` with `inventory_item_id` and `qty`, the linked item’s `current_qty` is **increased** by `qty` (purchase / restock), and `last_purchased_at` is set to the expense date.

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
