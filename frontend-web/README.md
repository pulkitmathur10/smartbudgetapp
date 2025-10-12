# SmartBudget+ Web (React + Vite)

A minimal web frontend that talks to your existing Flask backend.

## Quickstart

```bash
# 1) set backend URL (optional)
cp .env.example .env
# edit .env to point to your phone IP if needed, e.g.
# VITE_API_BASE=http://192.168.1.5:5000

# 2) install deps & run
npm install
npm run dev
# open the URL Vite prints (default http://localhost:5173)
```

## Build for production
```bash
npm run build
npm run preview
```

## Routes
- `/` – dashboard summary
- `/income` – add income
- `/expense` – add expense
- `/settings` – placeholder
