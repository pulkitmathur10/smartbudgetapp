import React, { useState } from 'react'
import axios from 'axios'
const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000'

export default function AddIncome(){
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState('')
  const [msg, setMsg] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API}/income`, {
        amount: parseFloat(amount),
        source,
        date: new Date().toISOString().split('T')[0]
      })
      setMsg('Saved!')
      setAmount(''); setSource('')
    } catch (err){
      setMsg('Error: ' + err.message)
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Add Income</h2>
      <label>Amount</label><br/>
      <input required type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} /><br/><br/>
      <label>Source</label><br/>
      <input value={source} onChange={e=>setSource(e.target.value)} /><br/><br/>
      <button type="submit">Save</button>
      {msg && <p>{msg}</p>}
    </form>
  )
}
