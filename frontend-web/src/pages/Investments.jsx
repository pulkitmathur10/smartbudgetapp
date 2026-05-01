import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PostAddIcon from '@mui/icons-material/PostAdd'
import { Alert, Button, Stack, TextField, Typography } from '@mui/material'
import api from '../api'
import Modal from '../components/Modal'
import DataTable from '../components/Table'

function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

const RECURRING_TYPES = ['mf', 'insurance', 'other']

function formatRecurringPlan(row) {
  if (row.premium_amount == null || row.premium_cadence == null) return '—'
  const a = Number(row.premium_amount)
  if (Number.isNaN(a)) return '—'
  if (row.premium_cadence === 'monthly') return `₹${a.toFixed(2)} / mo`
  if (row.premium_cadence === 'yearly') return `₹${a.toFixed(2)} / yr`
  return '—'
}

/** Cash put in via logged transactions: SIP instalments (buy) and insurance premiums (premium). */
function sumLoggedContributions(transactions) {
  if (!transactions?.length) return 0
  return transactions
    .filter((t) => t.kind === 'buy' || t.kind === 'premium')
    .reduce((s, t) => s + Number(t.amount), 0)
}

function totalContributed(row) {
  const prior = row.contributions_prior != null && row.contributions_prior !== '' ? Number(row.contributions_prior) : 0
  const p = Number.isNaN(prior) ? 0 : prior
  return p + sumLoggedContributions(row.transactions)
}

export default function Investments() {
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const [invModal, setInvModal] = useState(false)
  const [txModal, setTxModal] = useState(false)
  const [selectedInv, setSelectedInv] = useState(null)
  const [editingInv, setEditingInv] = useState(null)

  const invForm = useForm({
    defaultValues: {
      name: '',
      type: 'other',
      platform: '',
      current_value: 0,
      notes: '',
      premium_amount: '',
      premium_cadence: '',
      contributions_prior: '',
    },
  })
  const invType = invForm.watch('type')
  const txForm = useForm({
    defaultValues: { kind: 'buy', amount: '', units: '', date: todayISODate() },
  })
  const txKind = txForm.watch('kind')

  const load = () => {
    api
      .get('/investments', { params: { include_transactions: '1' } })
      .then((r) => setRows(r.data))
      .catch((e) => setMsg(e.message))
  }

  useEffect(() => {
    load()
  }, [])

  const openNewInv = () => {
    setEditingInv(null)
    invForm.reset({
      name: '',
      type: 'other',
      platform: '',
      current_value: 0,
      notes: '',
      premium_amount: '',
      premium_cadence: '',
      contributions_prior: '',
    })
    setInvModal(true)
  }

  const openEditInv = (row) => {
    setEditingInv(row)
    invForm.reset({
      name: row.name,
      type: row.type,
      platform: row.platform ?? '',
      current_value: row.current_value,
      notes: row.notes ?? '',
      premium_amount: row.premium_amount ?? '',
      premium_cadence: row.premium_cadence ?? '',
      contributions_prior: row.contributions_prior ?? '',
    })
    setInvModal(true)
  }

  const saveInv = (data) => {
    const payload = {
      name: data.name,
      type: data.type,
      platform: data.platform || null,
      current_value: parseFloat(data.current_value, 10) || 0,
      notes: data.notes || null,
    }
    const rawPrior = data.contributions_prior
    payload.contributions_prior =
      rawPrior === '' || rawPrior == null ? null : parseFloat(String(rawPrior), 10)
    if (payload.contributions_prior != null && Number.isNaN(payload.contributions_prior)) {
      payload.contributions_prior = null
    }

    if (RECURRING_TYPES.includes(data.type)) {
      const raw = data.premium_amount
      payload.premium_amount =
        raw === '' || raw == null ? null : parseFloat(String(raw), 10)
      if (payload.premium_amount != null && Number.isNaN(payload.premium_amount)) {
        payload.premium_amount = null
      }
      payload.premium_cadence =
        data.premium_cadence && data.premium_cadence !== '' ? data.premium_cadence : null
    } else {
      payload.premium_amount = null
      payload.premium_cadence = null
    }
    const req = editingInv ? api.put(`/investments/${editingInv.id}`, payload) : api.post('/investments', payload)
    req
      .then(() => {
        setMsg('Saved.')
        setInvModal(false)
        load()
      })
      .catch((e) => setMsg(e.response?.data?.message || e.message))
  }

  const removeInv = (id) => {
    if (!confirm('Delete this investment and all its transactions?')) return
    api
      .delete(`/investments/${id}`)
      .then(() => {
        load()
        setMsg('Deleted.')
      })
      .catch((e) => setMsg(e.message))
  }

  const openTx = (inv) => {
    setSelectedInv(inv)
    const defaultKind = inv.type === 'insurance' ? 'premium' : 'buy'
    txForm.reset({ kind: defaultKind, amount: '', units: '', date: todayISODate() })
    setTxModal(true)
  }

  const platformLabel =
    invType === 'insurance' ? 'Platform / insurer' : invType === 'mf' ? 'Platform / AMC' : 'Platform'

  const saveTx = (data) => {
    if (!selectedInv) return
    api
      .post(`/investments/${selectedInv.id}/transactions`, {
        kind: data.kind,
        amount: parseFloat(data.amount, 10),
        units: data.kind === 'premium' || data.units === '' ? null : parseFloat(data.units, 10),
        date: data.date,
      })
      .then(() => {
        setMsg('Transaction added.')
        setTxModal(false)
        load()
      })
      .catch((e) => setMsg(e.response?.data?.message || e.message))
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'platform', label: 'Platform', render: (r) => r.platform || '—' },
    {
      key: 'recurring_plan',
      label: 'Recurring plan',
      render: (r) => (RECURRING_TYPES.includes(r.type) ? formatRecurringPlan(r) : '—'),
    },
    {
      key: 'logged_in',
      label: 'Logged (buy + premium)',
      render: (r) => `₹${sumLoggedContributions(r.transactions).toFixed(2)}`,
    },
    {
      key: 'prior',
      label: 'Prior invested',
      render: (r) =>
        r.contributions_prior != null && r.contributions_prior !== ''
          ? `₹${Number(r.contributions_prior).toFixed(2)}`
          : '—',
    },
    {
      key: 'total_in',
      label: 'Total contributed',
      render: (r) => `₹${totalContributed(r).toFixed(2)}`,
    },
    { key: 'current_value', label: 'Current value', render: (r) => `₹${Number(r.current_value).toFixed(2)}` },
    {
      key: '_',
      label: '',
      align: 'right',
      render: (r) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
          <Button size="small" variant="outlined" startIcon={<PostAddIcon />} onClick={() => openTx(r)}>
            Add tx
          </Button>
          <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => openEditInv(r)}>
            Edit
          </Button>
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlineIcon />} onClick={() => removeInv(r.id)}>
            Delete
          </Button>
        </Stack>
      ),
    },
  ]

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Typography variant="h4" component="h1">
          Investments
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNewInv}>
          New investment
        </Button>
      </Stack>

      {msg && (
        <Alert severity="info" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />

      <Modal title={editingInv ? 'Edit investment' : 'New investment'} open={invModal} onClose={() => setInvModal(false)}>
        <form onSubmit={invForm.handleSubmit(saveInv)}>
          <Stack spacing={2}>
            <TextField label="Name" required fullWidth {...invForm.register('name', { required: true })} />
            <TextField select label="Type" fullWidth SelectProps={{ native: true }} {...invForm.register('type')}>
              <option value="stock">stock</option>
              <option value="mf">mf</option>
              <option value="fd">fd</option>
              <option value="crypto">crypto</option>
              <option value="insurance">insurance</option>
              <option value="other">other</option>
            </TextField>
            {RECURRING_TYPES.includes(invType) && (
              <>
                {invType === 'mf' && (
                  <Typography variant="body2" color="text.secondary">
                    For a SIP, set the instalment amount and cadence. Log each instalment with <strong>Add tx</strong> as{' '}
                    <strong>buy</strong> (units optional). <strong>Current value</strong> is the latest market / corpus
                    value.
                  </Typography>
                )}
                {invType === 'insurance' && (
                  <Typography variant="body2" color="text.secondary">
                    Set the expected premium and cadence. Log each payment as <strong>premium</strong> in{' '}
                    <strong>Add tx</strong>.
                  </Typography>
                )}
                {invType === 'other' && (
                  <Typography variant="body2" color="text.secondary">
                    Optional recurring amount (e.g. monthly deposit plan). Log actual payments with <strong>buy</strong>{' '}
                    or <strong>premium</strong> as fits your case.
                  </Typography>
                )}
                <TextField
                  label={invType === 'insurance' ? 'Premium amount' : 'Recurring amount (e.g. SIP instalment)'}
                  type="number"
                  inputProps={{ step: '0.01' }}
                  fullWidth
                  {...invForm.register('premium_amount')}
                />
                <TextField
                  select
                  label={invType === 'insurance' ? 'Premium cadence' : 'Cadence'}
                  fullWidth
                  SelectProps={{ native: true }}
                  {...invForm.register('premium_cadence')}
                >
                  <option value="">— not set —</option>
                  <option value="monthly">monthly</option>
                  <option value="yearly">yearly</option>
                </TextField>
              </>
            )}
            <TextField label={platformLabel} fullWidth {...invForm.register('platform')} />
            <TextField
              label="Current value (market / corpus / surrender value)"
              type="number"
              inputProps={{ step: '0.01' }}
              fullWidth
              {...invForm.register('current_value')}
            />
            <TextField
              label="Already invested (before logged transactions)"
              type="number"
              inputProps={{ step: '0.01' }}
              fullWidth
              {...invForm.register('contributions_prior')}
              helperText="Optional: total you put in earlier that is not represented as buy/premium rows below. Total contributed = this + logged buy + logged premium."
            />
            <TextField label="Notes" multiline rows={2} fullWidth {...invForm.register('notes')} />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button type="button" onClick={() => setInvModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Save
              </Button>
            </Stack>
          </Stack>
        </form>
      </Modal>

      <Modal title={`Transaction — ${selectedInv?.name || ''}`} open={txModal} onClose={() => setTxModal(false)}>
        <form onSubmit={txForm.handleSubmit(saveTx)}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Use <strong>valuation</strong> to set current value to the amount you enter. Use <strong>buy</strong> for MF
              SIP instalments (and other purchases). Use <strong>premium</strong> for insurance premium payments.
            </Typography>
            <TextField select label="Kind" fullWidth SelectProps={{ native: true }} {...txForm.register('kind')}>
              <option value="buy">buy</option>
              <option value="sell">sell</option>
              <option value="dividend">dividend</option>
              <option value="valuation">valuation</option>
              <option value="premium">premium</option>
            </TextField>
            <TextField label="Amount" type="number" inputProps={{ step: '0.01' }} required fullWidth {...txForm.register('amount', { required: true })} />
            {txKind !== 'premium' && (
              <TextField label="Units" type="number" inputProps={{ step: '0.0001' }} fullWidth {...txForm.register('units')} />
            )}
            <TextField label="Date" type="date" required fullWidth InputLabelProps={{ shrink: true }} {...txForm.register('date', { required: true })} />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button type="button" onClick={() => setTxModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Add
              </Button>
            </Stack>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
