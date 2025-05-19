/* eslint-disable prettier/prettier */
import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Card,
    CardContent,
    CardActions,
    Button,
    Modal,
    Box,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Paper,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { supabase } from '../../../api/supabaseClient';


const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 360,
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 24,
    p: 4,
};

const LoadsScreen = () => {
    // State to hold scheduled loads fetched from Supabase
    const [scheduledLoads, setScheduledLoads] = useState([]);
    const [devices, setDevices] = useState([]);
    // State for modal control and selected device scheduling info
    const [openModal, setOpenModal] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isAllDay, setAllDay] = useState(false);

    // Get current user session (this assumes you're using Supabase Auth)
    const [user, setUser] = useState(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    // Fetch scheduled loads for the logged in user from Supabase
    const fetchDevices = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('devices')
            .select('*')
        if (error) {
            console.error('Error fetching loads:', error.message);
        } else {
            setDevices(data);
        }
    };

    useEffect(() => {
        if (user) {
            fetchDevices();
        }
    }, [user]);

    // Fetch scheduled loads for the logged in user from Supabase
    const fetchScheduledLoads = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('loads')
            .select('*')
            .eq('user_id', user.id);
        if (error) {
            console.error('Error fetching loads:', error.message);
        } else {
            setScheduledLoads(data);
        }
    };

    useEffect(() => {
        if (user) {
            fetchScheduledLoads();
        }
    }, [user]);

    // Handler to open the modal for a selected device
    const handleOpenModal = (device) => {
        setSelectedDevice(device);
        // Reset dropdown selections
        setStartTime('');
        setEndTime('');
        setOpenModal(true);
    };

    // Handler to close the modal
    const handleCloseModal = () => {
        setOpenModal(false);
    };

    // Function to generate time options (e.g., "00:00" to "23:00")
    const generateTimeOptions = () => {
        const options = [];
        for (let i = 0; i < 24; i++) {
            const timeLabel = i.toString().padStart(2, '0') + ':00';
            options.push(timeLabel);
        }
        return options;
    };

    // Submit the scheduling data to Supabase
    const handleScheduleSubmit = async () => {
        // 1) basic required check, but skip time fields if all-day
        if (
            !user ||
            !selectedDevice ||
            (!isAllDay && (startTime === '' || endTime === ''))
        ) {
            alert('Please fill in all fields.');
            return;
        }

        // 2) only enforce ordering when not all-day
        if (!isAllDay && startTime >= endTime) {
            alert('Start time must be before end time.');
            return;
        }
        const newLoad = {
            user_id: user.id,
            device_id: selectedDevice.id,
            device_name: selectedDevice.name,
            power_rate: selectedDevice.power_rate,
            priority: selectedDevice.priority,
            start_time: isAllDay ? '00:00' : startTime,
            end_time: isAllDay ? '00:00' : endTime,
            is_all_day: isAllDay
        };

        const { data, error } = await supabase
            .from('loads')
            .insert([newLoad]);

        if (error) {
            console.error('Error inserting load:', error.message);
            alert('Failed to add schedule.');
        } else {
            alert('Schedule added successfully!');
            fetchScheduledLoads(); // Refresh the list
            handleCloseModal();
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Display available dummy devices */}
            <Grid container spacing={3}>
                {devices.map((device) => (
                    <Grid item xs={12} sm={6} md={4} key={device.id}>
                        <Card
                            sx={{
                                borderRadius: 2,
                                transition: 'transform 0.2s',
                                '&:hover': { transform: 'scale(1.02)', boxShadow: 6 },
                            }}
                        >
                            <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                                    {device.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Power Rate: {device.power_rate} W
                                </Typography>
                                <Typography variant="body3" color="text.secondary">
                                    Priority:{" "}
                                    {device.priority && device.priority >= 1 && device.priority <= 3
                                        ? Array.from({ length: device.priority }, (_, i) => (
                                            <span key={i} style={{ color: "#FFD700", fontSize: "1.2em" }}>★</span>
                                        ))
                                        : device.priority}
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'flex-end' }}>
                                <IconButton
                                    color="primary"
                                    onClick={() => handleOpenModal(device)}
                                    sx={{ p: 1 }}
                                >
                                    <ScheduleIcon fontSize="large" />
                                </IconButton>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Modal for scheduling */}
            <Modal open={openModal} onClose={handleCloseModal} closeAfterTransition>
                <Box sx={modalStyle}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                        Schedule {selectedDevice?.name}
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel id="start-time-label">Start Time</InputLabel>
                        <Select
                            disabled={isAllDay}
                            labelId="start-time-label"
                            value={startTime}
                            label="Start Time"
                            onChange={(e) => setStartTime(e.target.value)}
                        >
                            {generateTimeOptions().map((time) => (
                                <MenuItem key={time} value={time}>
                                    {time}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth sx={{ mb: 3 }}>
                        <InputLabel id="end-time-label">End Time</InputLabel>
                        <Select
                            disabled={isAllDay}
                            labelId="end-time-label"
                            value={endTime}
                            label="End Time"
                            onChange={(e) => setEndTime(e.target.value)}
                        >
                            {generateTimeOptions().map((time) => (
                                <MenuItem key={time} value={time}>
                                    {time}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={isAllDay}
                                onChange={e => setAllDay(e.target.checked)}
                            />
                        }
                        label="Run all day"
                    />
                    <Button variant="contained" color="primary" onClick={handleScheduleSubmit} fullWidth>
                        Save Schedule
                    </Button>
                </Box>
            </Modal>
        </Container>
    );
};

export default LoadsScreen;
