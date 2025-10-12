import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000'

export default function Home(){
  const [summary, setSummary] = useState({ income:0, expenses:0, balance:0 })
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`${API}/summary`)
      .then(r => setSummary(r.data))
      .catch(err => setError(err.message))
  }, [])

  return (
    <div>
      <h1>SmartBudget+ (Web)</h1>
      <p>Backend: <code>{API}</code></p>
      {error && <p style={{color:'crimson'}}>Error: {error}</p>}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12}}>
        <Card title='Income' value={`₹${summary.income}`} />
        <Card title='Expenses' value={`₹${summary.expenses}`} />
        <Card title='Balance' value={`₹${summary.balance}`} />
      </div>
    </div>
  )
}

function Card({title, value}){
  return (
    <div style={{border:'1px solid #ddd', borderRadius:12, padding:16}}>
      <div style={{fontSize:14, color:'#666'}}>{title}</div>
      <div style={{fontSize:24, fontWeight:700, marginTop:4}}>{value}</div>
    </div>
  )
}
