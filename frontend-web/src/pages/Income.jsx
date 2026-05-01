import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
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
import api from '../api'
import Modal from '../components/Modal'
import DataTable from '../components/Table'

function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

export default function Income() {
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState('')

  const form = useForm({
    defaultValues: {
      amount: '',
      date: todayISODate(),
      source: '',
      category_id: '',
      notes: '',
    },
  })

  const load = () => {
    api
      .get('/income', { params: { month, year } })
      .then((r) => setRows(r.data))
      .catch((e) => setMsg(e.message))
    api.get('/categories', { params: { kind: 'income' } }).then((r) => setCategories(r.data))
  }

  useEffect(() => {
    load()
  }, [month, year])

  const openAdd = () => {
    setEditing(null)
    form.reset({
      amount: '',
      date: todayISODate(),
      source: '',
      category_id: '',
      notes: '',
    })
    setModal(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    form.reset({
      amount: row.amount,
      date: row.date,
      source: row.source ?? '',
      category_id: row.category_id ?? '',
      notes: row.notes ?? '',
    })
    setModal(true)
  }

  const onSubmit = (data) => {
    const payload = {
      amount: parseFloat(data.amount, 10),
      date: data.date,
      source: data.source || null,
      category_id: data.category_id ? Number(data.category_id) : null,
      notes: data.notes || null,
    }
    const req = editing ? api.put(`/income/${editing.id}`, payload) : api.post('/income', payload)
    req
      .then(() => {
        setMsg('Saved.')
        setModal(false)
        load()
      })
      .catch((e) => setMsg(e.response?.data?.message || e.message))
  }

  const remove = (id) => {
    if (!confirm('Delete this income?')) return
    api
      .delete(`/income/${id}`)
      .then(() => {
        load()
        setMsg('Deleted.')
      })
      .catch((e) => setMsg(e.message))
  }

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount', render: (r) => `₹${Number(r.amount).toFixed(2)}` },
    { key: 'source', label: 'Source' },
    { key: 'category_name', label: 'Category', render: (r) => r.category_name || '—' },
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
        Income
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="inc-month">Month</InputLabel>
            <Select labelId="inc-month" label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
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
            Add income
          </Button>
        </Stack>
      </Paper>

      {msg && (
        <Alert severity="info" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />

      <Modal title={editing ? 'Edit income' : 'Add income'} open={modal} onClose={() => setModal(false)}>
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
            <TextField label="Source" fullWidth {...form.register('source')} />
            <TextField select label="Category" fullWidth SelectProps={{ native: true }} {...form.register('category_id')}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </TextField>
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
