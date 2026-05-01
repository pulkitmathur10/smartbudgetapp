import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import api from '../api'
import Modal from '../components/Modal'
import DataTable from '../components/Table'

function patternStatusChip(status) {
  const map = {
    no_linked_purchases: { label: 'No links', color: undefined },
    single_purchase: { label: 'Early', color: 'info' },
    insufficient_intervals: { label: 'Weak pattern', color: 'warning' },
    active: { label: 'Active pattern', color: 'success' },
  }
  const m = map[status] || { label: status, color: undefined }
  return (
    <Chip
      label={m.label}
      color={m.color}
      size="small"
      variant={m.color ? 'filled' : 'outlined'}
    />
  )
}

export default function Inventory() {
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [patterns, setPatterns] = useState([])
  const [patternsLoading, setPatternsLoading] = useState(false)
  const [includeLlm, setIncludeLlm] = useState(false)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState('')

  const form = useForm({
    defaultValues: {
      name: '',
      unit: 'pcs',
      current_qty: 0,
      reorder_threshold: 0,
      default_category_id: '',
    },
  })

  const loadPatterns = (withLlm) => {
    setPatternsLoading(true)
    const params = withLlm ? { include_llm: 1 } : {}
    api
      .get('/inventory/patterns', { params })
      .then((r) => setPatterns(r.data.items || []))
      .catch((e) => setMsg(e.response?.data?.message || e.message))
      .finally(() => setPatternsLoading(false))
  }

  const load = () => {
    api
      .get('/inventory')
      .then((r) => setRows(r.data))
      .catch((e) => setMsg(e.message))
    api.get('/categories', { params: { kind: 'expense' } }).then((r) => setCategories(r.data))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    loadPatterns(includeLlm)
  }, [includeLlm])

  const openAdd = () => {
    setEditing(null)
    form.reset({
      name: '',
      unit: 'pcs',
      current_qty: 0,
      reorder_threshold: 0,
      default_category_id: '',
    })
    setModal(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    form.reset({
      name: row.name,
      unit: row.unit,
      current_qty: row.current_qty,
      reorder_threshold: row.reorder_threshold,
      default_category_id: row.default_category_id ?? '',
    })
    setModal(true)
  }

  const onSubmit = (data) => {
    const payload = {
      name: data.name,
      unit: data.unit || 'pcs',
      current_qty: parseFloat(data.current_qty, 10) || 0,
      reorder_threshold: parseFloat(data.reorder_threshold, 10) || 0,
      default_category_id: data.default_category_id ? Number(data.default_category_id) : null,
    }
    const req = editing ? api.put(`/inventory/${editing.id}`, payload) : api.post('/inventory', payload)
    req
      .then(() => {
        setMsg('Saved.')
        setModal(false)
        load()
        loadPatterns(includeLlm)
      })
      .catch((e) => setMsg(e.response?.data?.message || e.message))
  }

  const remove = (id) => {
    if (!confirm('Delete this item?')) return
    api
      .delete(`/inventory/${id}`)
      .then(() => {
        load()
        loadPatterns(includeLlm)
        setMsg('Deleted.')
      })
      .catch((e) => setMsg(e.message))
  }

  const columns = [
    { key: 'name', label: 'Item' },
    { key: 'unit', label: 'Unit' },
    { key: 'current_qty', label: 'Qty' },
    { key: 'reorder_threshold', label: 'Reorder at' },
    {
      key: 'status',
      label: 'Stock',
      render: (r) =>
        Number(r.current_qty) <= Number(r.reorder_threshold) ? (
          <Chip label="Reorder" color="warning" size="small" />
        ) : (
          <Chip label="OK" color="success" variant="outlined" size="small" />
        ),
    },
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

  const patternColumns = [
    { key: 'name', label: 'Item' },
    {
      key: 'pattern_status',
      label: 'Pattern',
      render: (r) => patternStatusChip(r.pattern_status),
    },
    {
      key: 'median_interval_days',
      label: 'Median gap (d)',
      render: (r) => (r.median_interval_days != null ? r.median_interval_days : '—'),
    },
    { key: 'last_purchase_date', label: 'Last linked', render: (r) => r.last_purchase_date || '—' },
    { key: 'suggested_next_purchase_date', label: 'Habit next', render: (r) => r.suggested_next_purchase_date || '—' },
    {
      key: 'days_until_suggested',
      label: 'Days to habit date',
      render: (r) => (r.days_until_suggested != null ? r.days_until_suggested : '—'),
    },
    {
      key: 'hint',
      label: 'Summary',
      render: (r) => (
        <Typography variant="body2" sx={{ maxWidth: 280 }}>
          {(r.hint || '').slice(0, 200)}
          {(r.hint || '').length > 200 ? '…' : ''}
        </Typography>
      ),
    },
    {
      key: 'llm_insight',
      label: 'Vertex insight',
      render: (r) =>
        r.llm_insight ? (
          <Typography variant="body2" sx={{ maxWidth: 320 }}>
            {r.llm_insight}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {includeLlm ? '—' : 'Toggle AI for Gemini text'}
          </Typography>
        ),
    },
  ]

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Typography variant="h4" component="h1">
          Inventory
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Add item
        </Button>
      </Stack>

      {msg && (
        <Alert severity="info" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2}>
            <Typography variant="h6">Purchase rhythm (linked expenses)</Typography>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <FormControlLabel
                control={<Switch checked={includeLlm} onChange={(e) => setIncludeLlm(e.target.checked)} />}
                label="Vertex AI (Gemini) prose"
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={patternsLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                disabled={patternsLoading}
                onClick={() => loadPatterns(includeLlm)}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Intervals reflect how often you <strong>log</strong> linked purchases, not real-world consumption. Enable Vertex in backend env for AI
            columns.
          </Typography>
          {patternsLoading && <LinearProgress />}
          <DataTable columns={patternColumns} rows={patterns} rowKey={(r) => r.inventory_item_id} />
        </Stack>
      </Paper>

      <Modal title={editing ? 'Edit item' : 'Add item'} open={modal} onClose={() => setModal(false)}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <TextField label="Name" required fullWidth {...form.register('name', { required: true })} />
            <TextField label="Unit" fullWidth {...form.register('unit')} />
            <TextField label="Current qty" type="number" inputProps={{ step: '0.01' }} fullWidth {...form.register('current_qty')} />
            <TextField label="Reorder threshold" type="number" inputProps={{ step: '0.01' }} fullWidth {...form.register('reorder_threshold')} />
            <TextField select label="Default expense category" fullWidth SelectProps={{ native: true }} {...form.register('default_category_id')}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </TextField>
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
