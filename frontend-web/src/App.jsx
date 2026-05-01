import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Box, Container } from '@mui/material'
import NavBar from './components/NavBar'
import Dashboard from './pages/Dashboard'
import Income from './pages/Income'
import Expenses from './pages/Expenses'
import Investments from './pages/Investments'
import Inventory from './pages/Inventory'
import Budgets from './pages/Budgets'
import Recurring from './pages/Recurring'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <NavBar />
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, sm: 3 } }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/income" element={<Income />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/recurring" element={<Recurring />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Container>
    </Box>
  )
}
