import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const linkStyle = (active) => ({
  padding: '8px 12px',
  borderRadius: 8,
  textDecoration: 'none',
  color: active ? 'white' : '#111',
  background: active ? '#111' : '#eee',
  marginRight: 8
})

export default function NavBar(){
  const { pathname } = useLocation()
  return (
    <nav style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
      <Link to='/' style={linkStyle(pathname==='/')}>Home</Link>
      <Link to='/income' style={linkStyle(pathname==='/income')}>Add Income</Link>
      <Link to='/expense' style={linkStyle(pathname==='/expense')}>Add Expense</Link>
      <Link to='/settings' style={linkStyle(pathname==='/settings')}>Settings</Link>
    </nav>
  )
}
