import React, { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import {
  Alert,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import api from '../api'
import Modal from '../components/Modal'
import DataTable from '../components/Table'

function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

export default function Recurring() {
  const [rows, setRows] = useState([])
  const [expenseCats, setExpenseCats] = useState([])
  const [incomeCats, setIncomeCats] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState('')

  const form = useForm({
    defaultValues: {
      kind: 'expense',
      amount: '',
      category_id: '',
      cadence: 'monthly',
      next_run: todayISODate(),
      notes: '',
      source: '',
      is_active: true,
    },
  })
  const kind = form.watch('kind')

  const load = () => {
    api
      .get('/recurring')
      .then((r) => setRows(r.data))
      .catch((e) => setMsg(e.message))
    api.get('/categories', { params: { kind: 'expense' } }).then((r) => setExpenseCats(r.data))
    api.get('/categories', { params: { kind: 'income' } }).then((r) => setIncomeCats(r.data))
  }

  useEffect(() => {
    load()
  }, [])

  const cats = kind === 'income' ? incomeCats : expenseCats

  const openAdd = () => {
    setEditing(null)
    form.reset({
      kind: 'expense',
      amount: '',
      category_id: '',
      cadence: 'monthly',
      next_run: todayISODate(),
      notes: '',
      source: '',
      is_active: true,
    })
    setModal(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    form.reset({
      kind: row.kind,
      amount: row.amount,
      category_id: row.category_id ?? '',
      cadence: row.cadence,
      next_run: row.next_run,
      notes: row.notes ?? '',
      source: row.source ?? '',
      is_active: row.is_active,
    })
    setModal(true)
  }

  const onSubmit = (data) => {
    const payload = {
      kind: data.kind,
      amount: parseFloat(data.amount, 10),
      category_id: data.category_id ? Number(data.category_id) : null,
      cadence: data.cadence,
      next_run: data.next_run,
      notes: data.notes || null,
      source: data.kind === 'income' ? data.source || null : null,
      is_active: Boolean(data.is_active),
    }
    const req = editing ? api.put(`/recurring/${editing.id}`, payload) : api.post('/recurring', payload)
    req
      .then(() => {
        setMsg('Saved.')
        setModal(false)
        load()
      })
      .catch((e) => setMsg(e.response?.data?.message || e.message))
  }

  const remove = (id) => {
    if (!confirm('Delete this rule?')) return
    api
      .delete(`/recurring/${id}`)
      .then(() => {
        load()
        setMsg('Deleted.')
      })
      .catch((e) => setMsg(e.message))
  }

  const runNow = () => {
    api
      .post('/recurring/run-now')
      .then(() => {
        setMsg('Processed due recurring items.')
        load()
      })
      .catch((e) => setMsg(e.message))
  }

  const columns = [
    { key: 'kind', label: 'Kind' },
    { key: 'amount', label: 'Amount', render: (r) => `₹${Number(r.amount).toFixed(2)}` },
    { key: 'cadence', label: 'Cadence' },
    { key: 'next_run', label: 'Next run' },
    { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ flex: 1 }}>
          Recurring
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Add rule
        </Button>
        <Button variant="outlined" startIcon={<PlayArrowIcon />} onClick={runNow}>
          Run due now
        </Button>
      </Stack>

      {msg && (
        <Alert severity="info" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />

      <Modal title={editing ? 'Edit recurring' : 'Add recurring'} open={modal} onClose={() => setModal(false)}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <TextField select label="Kind" fullWidth SelectProps={{ native: true }} {...form.register('kind')}>
              <option value="expense">expense</option>
              <option value="income">income</option>
            </TextField>
            <TextField label="Amount" type="number" inputProps={{ step: '0.01' }} required fullWidth {...form.register('amount', { required: true })} />
            <TextField select label="Category" fullWidth SelectProps={{ native: true }} {...form.register('category_id')}>
              <option value="">None</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </TextField>
            {kind === 'income' && (
              <TextField label="Source label" fullWidth placeholder="e.g. Salary" {...form.register('source')} />
            )}
            <TextField select label="Cadence" fullWidth SelectProps={{ native: true }} {...form.register('cadence')}>
              <option value="monthly">monthly</option>
              <option value="weekly">weekly</option>
            </TextField>
            <TextField label="Next run" type="date" required fullWidth InputLabelProps={{ shrink: true }} {...form.register('next_run', { required: true })} />
            <Controller
              name="is_active"
              control={form.control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={Boolean(field.value)} onChange={(_, checked) => field.onChange(checked)} />}
                  label="Active"
                />
              )}
            />
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
