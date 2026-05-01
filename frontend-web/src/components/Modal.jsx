import React from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material'

export default function Modal({ title, open, onClose, children }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="body">
      <DialogTitle sx={{ pr: 6, fontWeight: 600 }}>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12, color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        {children}
      </DialogContent>
    </Dialog>
  )
}
