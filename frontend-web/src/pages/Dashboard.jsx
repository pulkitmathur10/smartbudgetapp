import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useTheme } from '@mui/material/styles'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api, { API_BASE } from '../api'
import KpiCard from '../components/Card'

export default function Dashboard() {
  const theme = useTheme()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [summary, setSummary] = useState(null)
  const [budgetStatus, setBudgetStatus] = useState({ items: [], any_over_budget: false })
  const [reorder, setReorder] = useState([])
  const [error, setError] = useState('')

  const piePalette = useMemo(
    () => [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      '#6366f1',
      '#0ea5e9',
      '#a855f7',
    ],
    [theme],
  )

  const load = () => {
    setError('')
    Promise.all([
      api.get('/summary', { params: { month, year } }),
      api.get('/budgets/status', { params: { month, year } }),
      api.get('/inventory/reorder'),
    ])
      .then(([s, b, r]) => {
        setSummary(s.data)
        setBudgetStatus(b.data)
        setReorder(r.data)
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
  }

  useEffect(() => {
    load()
  }, [month, year])

  const pieData = useMemo(
    () => (summary?.top_categories || []).map((c) => ({ name: c.name, value: c.amount })),
    [summary],
  )

  const barData = summary?.monthly_trend || []

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          API: <code>{API_BASE}</code>
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="dash-month">Month</InputLabel>
            <Select
              labelId="dash-month"
              label="Month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {i + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Year"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            sx={{ width: 120 }}
            inputProps={{ min: 2000, max: 2100 }}
          />
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>
            Refresh
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {budgetStatus.any_over_budget && (
        <Alert severity="error" variant="filled">
          <strong>Budget alert:</strong> One or more categories are over budget this month.
        </Alert>
      )}

      {reorder.length > 0 && (
        <Alert severity="warning">
          <strong>Reorder soon:</strong>{' '}
          {reorder.map((i) => `${i.name} (${i.current_qty} ${i.unit})`).join(', ')}
        </Alert>
      )}

      {summary && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
          <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
            <KpiCard title="Income" value={`₹${Number(summary.income).toFixed(2)}`} />
          </Box>
          <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
            <KpiCard title="Expenses" value={`₹${Number(summary.expenses).toFixed(2)}`} />
          </Box>
          <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
            <KpiCard title="Balance" value={`₹${Number(summary.balance).toFixed(2)}`} />
          </Box>
          <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
            <KpiCard title="Investments (total)" value={`₹${Number(summary.investments_total).toFixed(2)}`} />
          </Box>
        </Stack>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Last 6 months
        </Typography>
        <Box sx={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
              <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
              <Tooltip formatter={(v) => `₹${Number(v).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="income" fill={theme.palette.success.main} name="Income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill={theme.palette.error.main} name="Expenses" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Top categories ({month}/{year})
        </Typography>
        {pieData.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No expense data for this month.
          </Typography>
        ) : (
          <Box sx={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} paddingAngle={1}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={piePalette[i % piePalette.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `₹${Number(v).toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>
    </Stack>
  )
}
