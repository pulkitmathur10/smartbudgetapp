import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import AddIcon from '@mui/icons-material/Add'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SettingsIcon from '@mui/icons-material/Settings'
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import api, { API_BASE } from '../api'
import Modal from '../components/Modal'
import DataTable from '../components/Table'

export default function Settings() {
  const [categories, setCategories] = useState([])
  const [catModal, setCatModal] = useState(false)
  const [msg, setMsg] = useState('')

  const form = useForm({
    defaultValues: { name: '', kind: 'expense', parent_id: '' },
  })

  const loadCats = () => {
    api
      .get('/categories')
      .then((r) => setCategories(r.data))
      .catch((e) => setMsg(e.message))
  }

  useEffect(() => {
    loadCats()
  }, [])

  const exportJson = () => {
    api
      .get('/export')
      .then((r) => {
        const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `smartbudget-export-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(a.href)
        setMsg('Download started.')
      })
      .catch((e) => setMsg(e.message))
  }

  const addCategory = (data) => {
    api
      .post('/categories', {
        name: data.name,
        kind: data.kind,
        parent_id: data.parent_id ? Number(data.parent_id) : null,
      })
      .then(() => {
        setMsg('Category added.')
        setCatModal(false)
        form.reset({ name: '', kind: 'expense', parent_id: '' })
        loadCats()
      })
      .catch((e) => setMsg(e.response?.data?.message || e.message))
  }

  const removeCategory = (id) => {
    if (!confirm('Delete this category? Linked rows may fail.')) return
    api
      .delete(`/categories/${id}`)
      .then(() => {
        loadCats()
        setMsg('Deleted.')
      })
      .catch((e) => setMsg(e.message))
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'kind', label: 'Kind' },
    { key: 'parent_id', label: 'Parent id', render: (r) => r.parent_id ?? '—' },
    {
      key: '_',
      label: '',
      align: 'right',
      render: (r) => (
        <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlineIcon />} onClick={() => removeCategory(r.id)}>
          Delete
        </Button>
      ),
    },
  ]

  const importDoc = `POST ${API_BASE}/import/swiggy
POST ${API_BASE}/import/zomato
POST ${API_BASE}/import/sms

Body (JSON):
{
  "amount": 249.5,
  "merchant": "Swiggy",
  "raw": "optional raw text",
  "ts": "2026-05-01T12:00:00",
  "category_hint": "Eating Out"
}`

  return (
    <Stack spacing={4}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <SettingsIcon color="primary" fontSize="large" />
        <Box>
          <Typography variant="h4" component="h1">
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            API base: <code>{API_BASE}</code>
          </Typography>
        </Box>
      </Stack>

      {msg && (
        <Alert severity="info" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Data export
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Download categories, transactions, investments, inventory, budgets, and recurring rules as JSON.
        </Typography>
        <Button variant="contained" startIcon={<CloudDownloadIcon />} onClick={exportJson}>
          Export JSON
        </Button>
      </Paper>

      <Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
          <Typography variant="h6">Categories</Typography>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => {
              form.reset({ name: '', kind: 'expense', parent_id: '' })
              setCatModal(true)
            }}
          >
            Add category
          </Button>
        </Stack>
        <DataTable columns={columns} rows={categories} rowKey={(r) => r.id} />
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" gutterBottom>
          Import API (mobile / automation)
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Box component="pre" sx={{ m: 0, overflow: 'auto', fontSize: 12, fontFamily: 'ui-monospace, monospace' }}>
            {importDoc}
          </Box>
        </Paper>
      </Box>

      <Modal title="Add category" open={catModal} onClose={() => setCatModal(false)}>
        <form onSubmit={form.handleSubmit(addCategory)}>
          <Stack spacing={2}>
            <TextField label="Name" required fullWidth {...form.register('name', { required: true })} />
            <TextField select label="Kind" fullWidth SelectProps={{ native: true }} {...form.register('kind')}>
              <option value="expense">expense</option>
              <option value="income">income</option>
            </TextField>
            <TextField label="Parent category id (optional)" fullWidth placeholder="e.g. 3" {...form.register('parent_id')} />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button type="button" onClick={() => setCatModal(false)}>
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
