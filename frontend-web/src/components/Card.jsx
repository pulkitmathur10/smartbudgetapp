import React from 'react'
import { Card, CardContent, Typography } from '@mui/material'

/** KPI summary tile */
export default function KpiCard({ title, value, subtitle }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        {title && (
          <Typography color="text.secondary" variant="body2" gutterBottom>
            {title}
          </Typography>
        )}
        {value != null && (
          <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
            {value}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
