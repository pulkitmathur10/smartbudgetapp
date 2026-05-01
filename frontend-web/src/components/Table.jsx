import React from 'react'
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'

export default function DataTable({ columns, rows, rowKey, emptyMessage = 'No rows.' }) {
  if (!rows?.length) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography color="text.secondary" variant="body2">
          {emptyMessage}
        </Typography>
      </Paper>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            {columns.map((c) => (
              <TableCell
                key={c.key}
                align={c.align || 'left'}
                sx={{ fontWeight: 600, whiteSpace: 'nowrap', py: 1.5 }}
              >
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={rowKey ? rowKey(row) : i} hover>
              {columns.map((c) => (
                <TableCell key={c.key} align={c.align || 'left'} sx={{ verticalAlign: 'middle' }}>
                  {c.render ? c.render(row) : row[c.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
