import React, { forwardRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Slide, Button, Typography } from '@mui/material';

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});

export default function ErrorDialog({ open, message, onClose }) {
  return (
    <Dialog open={open} TransitionComponent={Transition} keepMounted onClose={onClose} aria-describedby="error-dialog-description">
      <DialogTitle sx={{ fontWeight: 'bold', color: 'error.main' }}>Error</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="error" variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
