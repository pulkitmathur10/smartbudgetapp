import React from 'react'
import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import AddIncome from './pages/AddIncome'
import AddExpense from './pages/AddExpense'
import Settings from './pages/Settings'

export default function App() {
  return (
    <div style={{maxWidth: 720, margin: '0 auto', padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial'}}>
      <NavBar />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/income' element={<AddIncome />} />
        <Route path='/expense' element={<AddExpense />} />
        <Route path='/settings' element={<Settings />} />
      </Routes>
    </div>
  )
}
