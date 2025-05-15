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
  Box
} from '@mui/material';
import { supabase } from '../../../api/supabaseClient';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  backgroundColor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  padding: 4,
};

export default function ScheduledDevicesTable() {
  const [scheduledLoads, setScheduledLoads] = useState([]);
  const [evSessions, setEvSessions]       = useState([]);
  const [user, setUser]                   = useState(null);
  const [detailsOpen, setDetailsOpen]     = useState(false);
  const [selectedItem, setSelectedItem]   = useState(null);
  const [isEv, setIsEv]                   = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) return;

      // fetch loads
      const { data: loads, error: loadErr } = await supabase
        .from('loads')
        .select('*')
        .eq('user_id', user.id);
      if (!loadErr) setScheduledLoads(loads || []);

      // fetch EV sessions
      const { data: evData, error: evErr } = await supabase
        .from('ev_sessions')
        .select('*')
        .eq('user_id', user.id);
      if (!evErr) setEvSessions(evData || []);
    }
    fetchData();
  }, []);

  const handleDeleteLoad = async id => {
    await supabase.from('loads').delete().eq('id', id);
    setScheduledLoads(sl => sl.filter(l => l.id !== id));
  };

  const handleDeleteEv = async id => {
    await supabase.from('ev_sessions').delete().eq('id', id);
    setEvSessions(ev => ev.filter(e => e.id !== id));
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* EV Sessions */}
      {evSessions.length > 0 && (
        <>
          <Typography variant="h6">EV Charging Sessions</Typography>
          <TableContainer component={Paper} sx={{ mt: 2, mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Charging Rate (kW)</strong></TableCell>
                  <TableCell><strong>Plug-in Time</strong></TableCell>
                  <TableCell><strong>Plug-out Time</strong></TableCell>
                  <TableCell><strong>Initial SoC (%)</strong></TableCell>
                  <TableCell><strong>Final SoC (%)</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {evSessions.map(ev => (
                  <TableRow key={ev.id}>
                    <TableCell>{ev.charging_rate}</TableCell>
                    <TableCell>{ev.plug_in_time}</TableCell>
                    <TableCell>{ev.plug_out_time}</TableCell>
                    <TableCell>{ev.initial_soc}</TableCell>
                    <TableCell>{ev.final_soc}</TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ mr: 1 }}
                        onClick={() => openDetails(ev, true)}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Scheduled Loads */}
      {scheduledLoads.length > 0 ? (
        <>
          <Typography style={{marginBottom : '15px'}} variant="h6">Loads List In Daily</Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Device Name</strong></TableCell>
                  <TableCell><strong>Power Rate (W)</strong></TableCell>
                  <TableCell><strong>Start Time</strong></TableCell>
                  <TableCell><strong>End Time</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scheduledLoads.map(load => (
                  <TableRow key={load.id}>
                    <TableCell>{load.device_name}</TableCell>
                    <TableCell>{load.power_rate}</TableCell>
                    <TableCell>{load.start_time}</TableCell>
                    <TableCell>{load.end_time}</TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ mr: 1 }}
                        onClick={() => openDetails(load, false)}
                      >
                        Details
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleDeleteLoad(load.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          No scheduled devices found.
        </Typography>
      )}

      {/* Details Modal */}
      <Modal open={detailsOpen} onClose={closeDetails}>
        <Box sx={modalStyle}>
          {selectedItem && (
            <>
              <Typography variant="h6" gutterBottom>
                {isEv ? 'EV Session Details' : selectedItem.device_name}
              </Typography>

              {isEv ? (
                <>
                  <Typography><strong>Charging Rate:</strong> {selectedItem.charging_rate} kW</Typography>
                  <Typography><strong>Plug-in Time:</strong> {selectedItem.plug_in_time}</Typography>
                  <Typography><strong>Plug-out Time:</strong> {selectedItem.plug_out_time}</Typography>
                  <Typography><strong>Initial SoC:</strong> {selectedItem.initial_soc}%</Typography>
                  <Typography><strong>Final SoC:</strong> {selectedItem.final_soc}%</Typography>
                  <Typography><strong>Daily Usage:</strong> {selectedItem.daily_usage} km</Typography>
                </>
              ) : (
                <>
                  <Typography><strong>Power Rate:</strong> {selectedItem.power_rate} W</Typography>
                  <Typography><strong>Start Time:</strong> {selectedItem.start_time}</Typography>
                  <Typography><strong>End Time:</strong> {selectedItem.end_time}</Typography>
                </>
              )}

              {selectedItem.created_at && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Created at: {new Date(selectedItem.created_at).toLocaleString()}
                </Typography>
              )}

              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                onClick={closeDetails}
              >
                Close
              </Button>
            </>
          )}
        </Box>
      </Modal>
    </Container>
  );
}
