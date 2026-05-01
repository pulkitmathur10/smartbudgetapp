import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
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

function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

export default function Expenses() {
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [inventory, setInventory] = useState([])
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [categoryId, setCategoryId] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState('')
  const [insightOpen, setInsightOpen] = useState(false)
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightText, setInsightText] = useState('')
  const [insightHint, setInsightHint] = useState('')
  const [insightTitle, setInsightTitle] = useState('')

  const form = useForm({
    defaultValues: {
      amount: '',
      date: todayISODate(),
      category_id: '',
      notes: '',
      payment_method: '',
      inventory_item_id: '',
      qty: '',
    },
  })

  const load = () => {
    const params = { month, year }
    if (categoryId) params.category_id = categoryId
    api
      .get('/expense', { params })
      .then((r) => setRows(r.data))
      .catch((e) => setMsg(e.message))
    api.get('/categories', { params: { kind: 'expense' } }).then((r) => setCategories(r.data))
    api.get('/inventory').then((r) => setInventory(r.data))
  }

  useEffect(() => {
    load()
  }, [month, year, categoryId])

  const openAdd = () => {
    setEditing(null)
    form.reset({
      amount: '',
      date: todayISODate(),
      category_id: '',
      notes: '',
      payment_method: '',
      inventory_item_id: '',
      qty: '',
    })
    setModal(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    form.reset({
      amount: row.amount,
      date: row.date,
      category_id: row.category_id ?? '',
      notes: row.notes ?? '',
      payment_method: row.payment_method ?? '',
      inventory_item_id: row.inventory_item_id ?? '',
      qty: row.qty ?? '',
    })
    setModal(true)
  }

  const onSubmit = (data) => {
    const payload = {
      amount: parseFloat(data.amount, 10),
      date: data.date,
      category_id: data.category_id ? Number(data.category_id) : null,
      notes: data.notes || null,
      payment_method: data.payment_method || null,
      inventory_item_id: data.inventory_item_id ? Number(data.inventory_item_id) : null,
      qty: data.qty === '' || data.qty == null ? null : parseFloat(data.qty, 10),
    }
    const req = editing
      ? api.put(`/expense/${editing.id}`, payload)
      : api.post('/expense', payload)
    req
      .then(() => {
        setMsg('Saved.')
        setModal(false)
        load()
      })
      .catch((e) => setMsg(e.response?.data?.message || e.message))
  }

  const openInsight = (row) => {
    if (!row.inventory_item_id) return
    setInsightTitle(`AI context — expense #${row.id}`)
    setInsightText('')
    setInsightHint('')
    setInsightOpen(true)
    setInsightLoading(true)
    api
      .post('/insights/expense', { expense_id: row.id })
      .then((r) => {
        setInsightText(r.data.llm_insight || '')
        setInsightHint(r.data.hint || '')
      })
      .catch((e) => setInsightHint(e.response?.data?.message || e.message))
      .finally(() => setInsightLoading(false))
  }

  const remove = (id) => {
    if (!confirm('Delete this expense?')) return
    api
      .delete(`/expense/${id}`)
      .then(() => {
        load()
        setMsg('Deleted.')
      })
      .catch((e) => setMsg(e.message))
  }

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount', render: (r) => `₹${Number(r.amount).toFixed(2)}` },
    { key: 'category_name', label: 'Category', render: (r) => r.category_name || '—' },
    { key: 'notes', label: 'Notes', render: (r) => (r.notes || '').slice(0, 48) },
    {
      key: '_',
      label: '',
      align: 'right',
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
          {r.inventory_item_id ? (
            <IconButton size="small" color="primary" aria-label="AI insight" onClick={() => openInsight(r)} title="Vertex AI insight">
              <AutoAwesomeIcon fontSize="small" />
            </IconButton>
          ) : null}
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
        Expenses
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="exp-month">Month</InputLabel>
            <Select
              labelId="exp-month"
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
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="exp-cat">Category filter</InputLabel>
            <Select
              labelId="exp-cat"
              label="Category filter"
              value={categoryId === '' ? '' : String(categoryId)}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add expense
          </Button>
        </Stack>
      </Paper>

      {msg && (
        <Alert severity="info" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />

      <Dialog open={insightOpen} onClose={() => setInsightOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{insightTitle}</DialogTitle>
        <DialogContent>
          {insightLoading && <LinearProgress sx={{ mb: 2 }} />}
          {insightText && (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {insightText}
            </Typography>
          )}
          {!insightLoading && insightHint && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: insightText ? 2 : 0 }}>
              {insightHint}
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      <Modal title={editing ? 'Edit expense' : 'Add expense'} open={modal} onClose={() => setModal(false)}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <TextField
              label="Amount"
              type="number"
              inputProps={{ step: '0.01' }}
              required
              fullWidth
              {...form.register('amount', { required: true })}
            />
            <TextField label="Date" type="date" required fullWidth InputLabelProps={{ shrink: true }} {...form.register('date', { required: true })} />
            <TextField select label="Category" fullWidth SelectProps={{ native: true }} {...form.register('category_id')}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </TextField>
            <TextField label="Payment method" fullWidth {...form.register('payment_method')} />
            <TextField select label="Link inventory" fullWidth SelectProps={{ native: true }} {...form.register('inventory_item_id')}>
              <option value="">None</option>
              {inventory.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </TextField>
            <TextField label="Qty purchased (adds to stock)" type="number" inputProps={{ step: '0.01' }} fullWidth {...form.register('qty')} />
            <TextField label="Notes" multiline rows={2} fullWidth {...form.register('notes')} />
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
