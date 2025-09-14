/* eslint-disable prettier/prettier */
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Modal,
  Box,
  Chip,
  Avatar,
  Stack,
  Card,
  CardContent,
  Divider,
  IconButton,
  Fade,
  Backdrop,
  Alert,
  Snackbar,
  Tooltip
} from '@mui/material';
import {
  ElectricCar as ElectricCarIcon,
  Devices as DevicesIcon,
  AccessTime as AccessTimeIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Bolt as FlashIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  Power as PowerIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { supabase } from '../../../api/supabaseClient';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  bgcolor: 'background.paper',
  borderRadius: 3,
  boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
  p: 4,
  border: 'none',
  outline: 'none'
};

export default function ScheduledDevicesTable() {
  const [scheduledLoads, setScheduledLoads] = useState([]);
  const [evSessions, setEvSessions] = useState([]);
  const [user, setUser] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEv, setIsEv] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      setUser(user);
      if (!user) return;

      // fetch loads
      const { data: loads, error: loadErr } = await supabase.from('loads').select('*').eq('user_id', user.id);
      if (!loadErr) setScheduledLoads(loads || []);

      // fetch EV sessions
      const { data: evData, error: evErr } = await supabase.from('ev_sessions').select('*').eq('user_id', user.id);
      if (!evErr) setEvSessions(evData || []);
    }
    fetchData();
  }, []);

  const handleDeleteLoad = async (id) => {
    try {
      await supabase.from('loads').delete().eq('id', id);
      setScheduledLoads((sl) => sl.filter((l) => l.id !== id));
      setSnackbar({ open: true, message: 'Load deleted successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete load.', severity: 'error' });
    }
  };

  const handleDeleteEv = async (id) => {
    try {
      await supabase.from('ev_sessions').delete().eq('id', id);
      setEvSessions((ev) => ev.filter((e) => e.id !== id));
      setSnackbar({ open: true, message: 'EV session deleted successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete EV session.', severity: 'error' });
    }
  };

  const openDetails = (item, evFlag) => {
    setSelectedItem(item);
    setIsEv(evFlag);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedItem(null);
    setIsEv(false);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            mb: 1,
            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Scheduled Loads
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
          View and manage your scheduled devices and EV charging sessions
        </Typography>
        <Divider sx={{ mt: 2, width: 60, height: 3, bgcolor: 'primary.main' }} />
      </Box>

      {/* EV Sessions Section */}
      {evSessions.length > 0 && (
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ bgcolor: 'success.light', color: 'success.main', mr: 2 }}>
                <ElectricCarIcon />
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                EV Charging Sessions
              </Typography>
              <Chip label={evSessions.length} color="success" size="small" sx={{ ml: 'auto', fontWeight: 600 }} />
            </Box>

            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                '& .MuiTableCell-head': {
                  bgcolor: 'rgba(25, 118, 210, 0.08)',
                  fontWeight: 600,
                  color: 'primary.main'
                }
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
                      <FlashIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                      Charging Rate (kW)
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AccessTimeIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                        Plug-in Time
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AccessTimeIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                        Plug-out Time
                      </Box>
                    </TableCell>
                    <TableCell>Initial SoC (%)</TableCell>
                    <TableCell>Final SoC (%)</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {evSessions.map((ev) => (
                    <TableRow
                      key={ev.id}
                      sx={{
                        '&:hover': {
                          bgcolor: 'action.hover',
                          '& .action-btn': {
                            opacity: 1
                          }
                        },
                        '& .action-btn': {
                          opacity: 0.7,
                          transition: 'opacity 0.2s'
                        }
                      }}
                    >
                      <TableCell>
                        <Chip label={`${ev.charging_rate} kW`} color="success" variant="outlined" size="small" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{ev.plug_in_time}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{ev.plug_out_time}</TableCell>
                      <TableCell>
                        <Chip label={`${ev.initial_soc}%`} color="info" variant="outlined" size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={`${ev.final_soc}%`} color="primary" variant="outlined" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            className="action-btn"
                            size="small"
                            onClick={() => openDetails(ev, true)}
                            sx={{
                              color: 'primary.main',
                              '&:hover': { bgcolor: 'primary.light', color: 'white' }
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Loads Section */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', mr: 2 }}>
              <DevicesIcon />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Daily Load Schedule
            </Typography>
            <Chip label={scheduledLoads.length} color="primary" size="small" sx={{ ml: 'auto', fontWeight: 600 }} />
          </Box>

          {scheduledLoads.length > 0 ? (
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                '& .MuiTableCell-head': {
                  bgcolor: 'rgba(25, 118, 210, 0.08)',
                  fontWeight: 600,
                  color: 'primary.main'
                }
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DevicesIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                        Device Name
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PowerIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                        Power Rate (W)
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ScheduleIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                        Start Time
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ScheduleIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                        End Time
                      </Box>
                    </TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scheduledLoads.map((load) => (
                    <TableRow
                      key={load.id}
                      sx={{
                        '&:hover': {
                          bgcolor: 'action.hover',
                          '& .action-btn': {
                            opacity: 1
                          }
                        },
                        '& .action-btn': {
                          opacity: 0.7,
                          transition: 'opacity 0.2s'
                        }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: 'primary.light',
                              color: 'primary.main',
                              mr: 2,
                              fontSize: '0.875rem'
                            }}
                          >
                            <DevicesIcon fontSize="small" />
                          </Avatar>
                          <Typography sx={{ fontWeight: 500 }}>{load.device_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={`${load.power_rate} W`} color="warning" variant="outlined" size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={load.start_time} color="info" variant="outlined" size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={load.end_time} color="secondary" variant="outlined" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="View Details">
                            <IconButton
                              className="action-btn"
                              size="small"
                              onClick={() => openDetails(load, false)}
                              sx={{
                                color: 'primary.main',
                                '&:hover': { bgcolor: 'primary.light', color: 'white' }
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Load">
                            <IconButton
                              className="action-btn"
                              size="small"
                              onClick={() => handleDeleteLoad(load.id)}
                              sx={{
                                color: 'error.main',
                                '&:hover': { bgcolor: 'error.light', color: 'white' }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box
              sx={{
                textAlign: 'center',
                py: 6,
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                borderRadius: 3,
                border: '2px dashed',
                borderColor: 'divider'
              }}
            >
              <DevicesIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
                No scheduled devices found
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                Schedule some devices to see them here
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Details Modal */}
      <Modal
        open={detailsOpen}
        onClose={closeDetails}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: { bgcolor: 'rgba(0, 0, 0, 0.7)' }
        }}
      >
        <Fade in={detailsOpen}>
          <Box sx={modalStyle}>
            {selectedItem && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        bgcolor: isEv ? 'success.light' : 'primary.light',
                        color: isEv ? 'success.main' : 'primary.main',
                        mr: 2
                      }}
                    >
                      {isEv ? <ElectricCarIcon /> : <DevicesIcon />}
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {isEv ? 'EV Session Details' : selectedItem.device_name}
                    </Typography>
                  </Box>
                  <IconButton onClick={closeDetails} sx={{ color: 'text.secondary' }}>
                    <CloseIcon />
                  </IconButton>
                </Box>

                <Divider sx={{ mb: 3 }} />

                <Stack spacing={3}>
                  {isEv ? (
                    <>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: 'success.light',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'success.main'
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          <FlashIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Charging Rate: {selectedItem.charging_rate} kW
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          p: 2,
                          bgcolor: 'info.light',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'info.main'
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          <AccessTimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Plug-in Time: {selectedItem.plug_in_time}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          <AccessTimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Plug-out Time: {selectedItem.plug_out_time}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          p: 2,
                          bgcolor: 'warning.light',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'warning.main'
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          Initial SoC: {selectedItem.initial_soc}%
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Final SoC: {selectedItem.final_soc}%
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Daily Usage: {selectedItem.daily_usage} km
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: 'primary.light',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'primary.main'
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          <PowerIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Power Rate: {selectedItem.power_rate} W
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          p: 2,
                          bgcolor: 'secondary.light',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'secondary.main'
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Start Time: {selectedItem.start_time}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          End Time: {selectedItem.end_time}
                        </Typography>
                      </Box>
                    </>
                  )}

                  {selectedItem.created_at && (
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'grey.100',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'grey.300'
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        <InfoIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: '1rem' }} />
                        Created: {new Date(selectedItem.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                </Stack>

                <Button
                  variant="contained"
                  fullWidth
                  sx={{
                    mt: 4,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1565c0, #1976d2)'
                    }
                  }}
                  onClick={closeDetails}
                >
                  Close
                </Button>
              </>
            )}
          </Box>
        </Fade>
      </Modal>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
