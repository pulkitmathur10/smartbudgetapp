import { alpha, createTheme } from '@mui/material/styles'

const brand = {
  main: '#0d5c63',
  light: '#3d858c',
  dark: '#084045',
  contrastText: '#fff',
}

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: brand,
    secondary: {
      main: '#5c4d7c',
      contrastText: '#fff',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
    success: { main: '#1b7f5a' },
    error: { main: '#c62828' },
    warning: { main: '#b45309' },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
    divider: alpha('#0f172a', 0.08),
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${alpha('#0f172a', 0.08)}`,
        },
      },
    },
  },
})
