import React from 'react'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/income', label: 'Income' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/investments', label: 'Investments' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/budgets', label: 'Budgets' },
  { to: '/recurring', label: 'Recurring' },
  { to: '/settings', label: 'Settings' },
]

export default function NavBar() {
  const { pathname } = useLocation()

  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ mb: 0 }}>
      <Container maxWidth="lg" disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
        <Toolbar disableGutters sx={{ gap: 2, flexWrap: 'wrap', py: 1.5 }}>
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              textDecoration: 'none',
              color: 'text.primary',
              mr: 1,
            }}
          >
            <AccountBalanceWalletIcon color="primary" fontSize="medium" />
            <Typography variant="h6" fontWeight={700} letterSpacing="-0.03em">
              SmartBudget
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              flex: 1,
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
            }}
          >
            {links.map(({ to, label }) => {
              const active = pathname === to
              return (
                <Button
                  key={to}
                  component={RouterLink}
                  to={to}
                  variant={active ? 'contained' : 'text'}
                  color={active ? 'primary' : 'inherit'}
                  size="medium"
                  sx={{
                    fontWeight: 600,
                    ...(active
                      ? {}
                      : {
                          color: 'text.secondary',
                          '&:hover': { bgcolor: 'action.hover' },
                        }),
                  }}
                >
                  {label}
                </Button>
              )
            })}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
}
