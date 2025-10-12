import React, { useState } from 'react'
import axios from 'axios'
const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000'

export default function AddExpense(){
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [msg, setMsg] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API}/expense`, {
        amount: parseFloat(amount),
        category,
        date: new Date().toISOString().split('T')[0]
      })
      setMsg('Saved!')
      setAmount(''); setCategory('')
    } catch (err){
      setMsg('Error: ' + err.message)
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Add Expense</h2>
      <label>Amount</label><br/>
      <input required type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} /><br/><br/>
      <label>Category</label><br/>
      <input value={category} onChange={e=>setCategory(e.target.value)} /><br/><br/>
      <button type="submit">Save</button>
      {msg && <p>{msg}</p>}
    </form>
  )
}
