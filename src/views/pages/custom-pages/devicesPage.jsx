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
    Checkbox,
    Chip,
    Avatar,
    Fade,
    Zoom,
    Backdrop,
    Divider,
    Stack,
    Alert,
    Snackbar
} from '@mui/material';
import {
    Schedule as ScheduleIcon,
    PowerSettingsNew as PowerIcon,
    Star as StarIcon,
    FlashOn as FlashOnIcon,
    Devices as DevicesIcon,
    AccessTime as AccessTimeIcon,
    Check as CheckIcon
} from '@mui/icons-material';
import { supabase } from '../../../api/supabaseClient';


const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 450,
    bgcolor: 'background.paper',
    borderRadius: 3,
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
    p: 4,
    border: 'none',
    outline: 'none'
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
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Get current user session (this assumes you're using Supabase Auth)
    const [user, setUser] = useState(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    useEffect(() => {
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

        if (user) {
            fetchDevices();
        }
    }, [user]);

    useEffect(() => {
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
        setAllDay(false);
        setOpenModal(true);
    };

    // Handler to close the modal
    const handleCloseModal = () => {
        setOpenModal(false);
        setSelectedDevice(null);
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
            setSnackbar({ open: true, message: 'Please fill in all fields.', severity: 'error' });
            return;
        }

        // 2) only enforce ordering when not all-day
        if (!isAllDay && startTime >= endTime) {
            setSnackbar({ open: true, message: 'Start time must be before end time.', severity: 'error' });
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
            setSnackbar({ open: true, message: 'Failed to add schedule.', severity: 'error' });
        } else {
            setSnackbar({ open: true, message: 'Schedule added successfully!', severity: 'success' });
            // Refresh the list
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
            fetchScheduledLoads();
            handleCloseModal();
        }
    };

    const getPriorityStars = (priority) => {
        if (priority >= 1 && priority <= 3) {
            return Array.from({ length: 4 - priority }, (_, i) => (
                <StarIcon key={i} sx={{ color: '#FFD700', fontSize: '1.2em' }} />
            ));
        }
        return priority;
    };

    const getDeviceIcon = (deviceName) => {
        const name = deviceName?.toLowerCase() || '';
        if (name.includes('washing') || name.includes('dishwasher')) return <PowerIcon />;
        if (name.includes('heater') || name.includes('ac')) return <FlashOnIcon />;
        return <DevicesIcon />;
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
                    Smart Devices
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                    Schedule and manage your energy devices efficiently
                </Typography>
                <Divider sx={{ mt: 2, width: 60, height: 3, bgcolor: 'primary.main' }} />
            </Box>

            {/* Devices Grid */}
            <Grid container spacing={3}>
                {devices.map((device, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={device.id}>
                        <Zoom in={true} timeout={300 + index * 100}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: 3,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': { 
                                        transform: 'translateY(-8px)',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                                        borderColor: 'primary.main',
                                        '& .device-icon': {
                                            transform: 'scale(1.1) rotate(5deg)',
                                            color: 'primary.main'
                                        },
                                        '& .schedule-btn': {
                                            transform: 'scale(1.05)',
                                            bgcolor: 'primary.main',
                                            color: 'white'
                                        }
                                    },
                                }}
                            >
                                <CardContent sx={{ p: 3, pb: 1 }}>
                                    {/* Device Icon & Name */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Avatar 
                                            className="device-icon"
                                            sx={{ 
                                                width: 48, 
                                                height: 48, 
                                                bgcolor: 'primary.light',
                                                color: 'primary.main',
                                                mr: 2,
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            {getDeviceIcon(device.name)}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography 
                                                variant="h6" 
                                                sx={{ 
                                                    fontWeight: 600,
                                                    fontSize: '1.1rem',
                                                    lineHeight: 1.2,
                                                    color: 'text.primary'
                                                }}
                                            >
                                                {device.name}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Device Info */}
                                    <Stack spacing={2}>
                                        <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            p: 1.5,
                                            bgcolor: 'rgba(25, 118, 210, 0.08)',
                                            borderRadius: 2,
                                            border: '1px solid rgba(25, 118, 210, 0.2)'
                                        }}>
                                            <FlashOnIcon sx={{ color: 'warning.main', mr: 1, fontSize: '1.2rem' }} />
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                <strong>{device.power_rate} W</strong>
                                            </Typography>
                                        </Box>

                                        <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            p: 1.5,
                                            bgcolor: 'rgba(255, 193, 7, 0.08)',
                                            borderRadius: 2,
                                            border: '1px solid rgba(255, 193, 7, 0.2)'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                <Typography variant="body2" sx={{ fontWeight: 500, mr: 1 }}>
                                                    Priority:
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    {getPriorityStars(device.priority)}
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Stack>
                                </CardContent>
                                
                                <CardActions sx={{ p: 3, pt: 1, justifyContent: 'center' }}>
                                    <Button
                                        className="schedule-btn"
                                        variant="outlined"
                                        onClick={() => handleOpenModal(device)}
                                        startIcon={<AccessTimeIcon />}
                                        sx={{
                                            width: '100%',
                                            py: 1,
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            fontSize: '0.95rem',
                                            transition: 'all 0.3s ease',
                                            border: '2px solid',
                                            borderColor: 'primary.main',
                                            color: 'primary.main',
                                            '&:hover': {
                                                borderColor: 'primary.dark',
                                            }
                                        }}
                                    >
                                        Schedule Device
                                    </Button>
                                </CardActions>
                            </Card>
                        </Zoom>
                    </Grid>
                ))}
            </Grid>

            {devices.length === 0 && (
                <Box sx={{ 
                    textAlign: 'center', 
                    py: 8,
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    borderRadius: 3,
                    border: '2px dashed',
                    borderColor: 'divider'
                }}>
                    <DevicesIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 600 }}>
                        No devices found
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                        Add some devices to start scheduling
                    </Typography>
                </Box>
            )}

            {/* Enhanced Modal for scheduling */}
            <Modal 
                open={openModal} 
                onClose={handleCloseModal}
                closeAfterTransition
                BackdropComponent={Backdrop}
                BackdropProps={{
                    timeout: 500,
                    sx: { bgcolor: 'rgba(0, 0, 0, 0.7)' }
                }}
            >
                <Fade in={openModal}>
                    <Box sx={modalStyle}>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h5" sx={{ 
                                fontWeight: 700,
                                color: 'primary.main',
                                mb: 1,
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <ScheduleIcon sx={{ mr: 2, fontSize: '1.5rem' }} />
                                Schedule Device
                            </Typography>
                            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
                                {selectedDevice?.name}
                            </Typography>
                            <Divider sx={{ mt: 2 }} />
                        </Box>

                        <Stack spacing={3}>
                            <FormControl fullWidth variant="outlined">
                                <InputLabel id="start-time-label">Start Time</InputLabel>
                                <Select
                                    disabled={isAllDay}
                                    labelId="start-time-label"
                                    value={startTime}
                                    label="Start Time"
                                    onChange={(e) => setStartTime(e.target.value)}
                                    sx={{
                                        borderRadius: 2,
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderWidth: 2
                                        }
                                    }}
                                >
                                    {generateTimeOptions().map((time) => (
                                        <MenuItem key={time} value={time}>
                                            {time}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth variant="outlined">
                                <InputLabel id="end-time-label">End Time</InputLabel>
                                <Select
                                    disabled={isAllDay}
                                    labelId="end-time-label"
                                    value={endTime}
                                    label="End Time"
                                    onChange={(e) => setEndTime(e.target.value)}
                                    sx={{
                                        borderRadius: 2,
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderWidth: 2
                                        }
                                    }}
                                >
                                    {generateTimeOptions().map((time) => (
                                        <MenuItem key={time} value={time}>
                                            {time}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Box sx={{ 
                                p: 2,
                                bgcolor: 'rgba(25, 118, 210, 0.08)',
                                borderRadius: 2,
                                border: '1px solid rgba(25, 118, 210, 0.2)'
                            }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={isAllDay}
                                            onChange={e => setAllDay(e.target.checked)}
                                            sx={{
                                                '&.Mui-checked': {
                                                    color: 'primary.main'
                                                }
                                            }}
                                        />
                                    }
                                    label={
                                        <Typography sx={{ fontWeight: 500 }}>
                                            Run all day
                                        </Typography>
                                    }
                                />
                            </Box>

                            <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
                                <Button 
                                    variant="outlined" 
                                    onClick={handleCloseModal}
                                    sx={{ 
                                        flex: 1,
                                        py: 1.5,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderWidth: 2
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    variant="contained" 
                                    onClick={handleScheduleSubmit}
                                    startIcon={<CheckIcon />}
                                    sx={{ 
                                        flex: 1,
                                        py: 1.5,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                                        '&:hover': {
                                            background: 'linear-gradient(45deg, #1565c0, #1976d2)',
                                        }
                                    }}
                                >
                                    Save Schedule
                                </Button>
                            </Stack>
                        </Stack>
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
};

export default LoadsScreen;
