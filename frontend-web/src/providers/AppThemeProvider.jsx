import React from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { appTheme } from '../theme'

export default function AppThemeProvider({ children }) {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}
