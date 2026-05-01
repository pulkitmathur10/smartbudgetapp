# Smart Budget Web (React + Vite)

Web UI for the Smart Budget Flask API: dashboard, income/expenses, investments, inventory, budgets, recurring rules, settings (categories + JSON export). Built with **React**, **Vite**, and **Material UI (MUI)** for layout, forms, tables, and navigation.

## Quickstart

```bash
# Optional: point to your Flask server
cp .env.example .env
# VITE_API_BASE=http://127.0.0.1:5000

cd frontend-web
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). Start the backend from `../backend` (`python App.py`).

## Build

```bash
npm run build
npm run preview
```

## Routes

| Path | Page |
|------|------|
| `/` | Dashboard (KPIs, 6‑month bar chart, category pie, budget & reorder banners) |
| `/income` | Income list / add / edit |
| `/expenses` | Expense list / filters / add / edit (optional inventory link) |
| `/investments` | Holdings + transactions (valuation updates current value) |
| `/inventory` | Stock + reorder thresholds |
| `/budgets` | Monthly limits + spend vs budget |
| `/recurring` | Recurring income/expense rules + “Run due now” |
| `/settings` | Categories CRUD, full JSON export, import API docs |

## Import API (for mobile / automation)

The backend accepts POSTs to `/import/swiggy`, `/import/zomato`, and `/import/sms` with a normalized JSON body. See [backend/Readme.md](../backend/Readme.md) for the contract. A future Android listener or companion app can POST parsed order totals there.
