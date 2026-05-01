import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import App from './App'
import AppThemeProvider from './providers/AppThemeProvider'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppThemeProvider>
      <App />
    </AppThemeProvider>
  </BrowserRouter>,
)