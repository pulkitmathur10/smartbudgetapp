import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import api from '../api'
import Modal from '../components/Modal'
import DataTable from '../components/Table'

export default function Budgets() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budgets, setBudgets] = useState([])
  const [status, setStatus] = useState({ items: [] })
  const [categories, setCategories] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState('')

  const form = useForm({
    defaultValues: { category_id: '', limit_amount: '' },
  })

  const load = () => {
    api
      .get('/budgets', { params: { month, year } })
      .then((r) => setBudgets(r.data))
      .catch((e) => setMsg(e.message))
    api
      .get('/budgets/status', { params: { month, year } })
      .then((r) => setStatus(r.data))
      .catch(() => {})
    api.get('/categories', { params: { kind: 'expense' } }).then((r) => setCategories(r.data))
  }

  useEffect(() => {
    load()
  }, [month, year])

  const openAdd = () => {
    setEditing(null)
    form.reset({ category_id: '', limit_amount: '' })
    setModal(true)
  }

  const openEdit = (b) => {
    setEditing(b)
    form.reset({ category_id: b.category_id, limit_amount: b.limit_amount })
    setModal(true)
  }

  const onSubmit = (data) => {
    const payload = {
      category_id: Number(data.category_id),
      month,
      year,
      limit_amount: parseFloat(data.limit_amount, 10),
    }
    const req = editing ? api.put(`/budgets/${editing.id}`, payload) : api.post('/budgets', payload)
    req
      .then(() => {
        setMsg('Saved.')
        setModal(false)
        load()
      })
      .catch((e) => setMsg(e.response?.data?.message || e.message))
  }

  const remove = (id) => {
    if (!confirm('Remove this budget?')) return
    api
      .delete(`/budgets/${id}`)
      .then(() => {
        load()
        setMsg('Deleted.')
      })
      .catch((e) => setMsg(e.message))
  }

  const statusColumns = [
    { key: 'category_name', label: 'Category' },
    { key: 'limit', label: 'Limit', render: (r) => `₹${Number(r.limit).toFixed(2)}` },
    { key: 'spent', label: 'Spent', render: (r) => `₹${Number(r.spent).toFixed(2)}` },
    { key: 'pct', label: '%', render: (r) => `${r.pct}%` },
    {
      key: 'over_budget',
      label: 'Status',
      render: (r) => (r.over_budget ? <Chip label="Over budget" color="error" size="small" /> : <Chip label="On track" size="small" variant="outlined" />),
    },
  ]

  const budgetColumns = [
    {
      key: 'category_id',
      label: 'Category',
      render: (r) => categories.find((c) => c.id === r.category_id)?.name || r.category_id,
    },
    { key: 'limit_amount', label: 'Limit', render: (r) => `₹${Number(r.limit_amount).toFixed(2)}` },
    {
      key: '_',
      label: '',
      align: 'right',
      render: (r) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlineIcon />} onClick={() => remove(r.id)}>
            Delete
          </Button>
        </Stack>
      ),
    },
  ]

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        Budgets
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="bud-month">Month</InputLabel>
            <Select labelId="bud-month" label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
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
          />
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add budget
          </Button>
        </Stack>
      </Paper>

      {msg && (
        <Alert severity="info" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}

      <Typography variant="h6">Status</Typography>
      <DataTable columns={statusColumns} rows={status.items || []} rowKey={(r) => r.budget_id} emptyMessage="No budgets for this month." />

      <Typography variant="h6" sx={{ mt: 1 }}>
        Limits
      </Typography>
      <DataTable columns={budgetColumns} rows={budgets} rowKey={(r) => r.id} />

      <Modal title={editing ? 'Edit budget' : 'Add budget'} open={modal} onClose={() => setModal(false)}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Applies to <strong>{month}/{year}</strong>
            </Typography>
            <TextField select label="Category" required fullWidth SelectProps={{ native: true }} {...form.register('category_id', { required: true })}>
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </TextField>
            <TextField
              label="Limit (₹)"
              type="number"
              inputProps={{ step: '0.01' }}
              required
              fullWidth
              {...form.register('limit_amount', { required: true })}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button type="button" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Save
              </Button>
            </Stack>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
