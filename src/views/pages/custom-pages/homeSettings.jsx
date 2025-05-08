/* eslint-disable prettier/prettier */
import React, { useState } from 'react';
import {
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    FormControl,
    FormControlLabel,
    RadioGroup,
    Radio,
    TextField,
    FormLabel
} from '@mui/material';
import EnergyGeneration from './energyGenerationPage';

const HomeSettingsPage = () => {
    // State for energy generation settings
    const [energyGeneration, setEnergyGeneration] = useState({
        type: 'PV Panel', // default selection
        ratedPower: '',
    });

    // State for meteorological data settings
    const [meteorological, setMeteorological] = useState({
        dataType: 'Solar', // default selection
        duration: 'One Month', // default duration
        season: 'Winter',   
    });

    const handleSeasonChange = (_, value) =>
        setMeteorological(prev => ({ ...prev, season: value }));

    // Handler for energy generation type change
    const handleEnergyTypeChange = (event) => {
        setEnergyGeneration((prev) => ({
            ...prev,
            type: event.target.value,
        }));
    };

    // Handler for the rated power input change
    const handleRatedPowerChange = (event) => {
        setEnergyGeneration((prev) => ({
            ...prev,
            ratedPower: event.target.value,
        }));
    };

    // Handler for meteorological data type change
    const handleMeteorologicalTypeChange = (event) => {
        setMeteorological((prev) => ({
            ...prev,
            dataType: event.target.value,
        }));
    };

    // Handler for duration change
    const handleDurationChange = (event) => {
        setMeteorological((prev) => ({
            ...prev,
            duration: event.target.value,
        }));
    };

    // Placeholder function to fetch the daily loading profile
    const fetchDailyLoadingProfile = () => {
        console.log("Fetching daily loading profile...");
        // Insert logic to obtain daily loading profile here.
    };

    // Placeholder function to fetch meteorological data
    const fetchMeteorologicalData = () => {
        console.log("Fetching meteorological data...");
        console.log("Data Type:", meteorological.dataType, "Duration:", meteorological.duration);
        // Insert logic to obtain meteorological data here.
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
                {/* Daily Loading Profile Section */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Obtain Daily Loading Profile of Home
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                Click the button below to fetch the daily loading profile of your home.
                            </Typography>
                            <Button variant="contained" color="primary" onClick={fetchDailyLoadingProfile}>
                                Get Loading Profile
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Energy Generation Section */}
                <Grid item xs={12}>
                    <EnergyGeneration />
                </Grid>

                {/* Meteorological Data Section */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Get Meteorological Data
                            </Typography>

                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                Select the type of meteorological data, the duration, and the season.
                            </Typography>

                            {/* Data Type */}
                            <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
                                <FormLabel component="legend">Data Type</FormLabel>
                                <RadioGroup
                                    row
                                    name="dataType"
                                    value={meteorological.dataType}
                                    onChange={handleMeteorologicalTypeChange}
                                >
                                    <FormControlLabel value="Solar" control={<Radio />} label="Solar" />
                                    <FormControlLabel value="Wind" control={<Radio />} label="Wind" />
                                </RadioGroup>
                            </FormControl>

                            {/* Duration */}
                            <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
                                <FormLabel component="legend">Duration</FormLabel>
                                <RadioGroup
                                    row
                                    name="duration"
                                    value={meteorological.duration}
                                    onChange={handleDurationChange}
                                >
                                    <FormControlLabel value="One Month" control={<Radio />} label="One Month" />
                                    <FormControlLabel value="One Year" control={<Radio />} label="One Year" />
                                </RadioGroup>
                            </FormControl>

                            {/* ▼▼ New Season selector ▼▼ */}
                            <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
                                <FormLabel component="legend">Season</FormLabel>
                                <RadioGroup
                                    row
                                    name="season"
                                    value={meteorological.season}
                                    onChange={handleSeasonChange}
                                >
                                    <FormControlLabel value="Winter" control={<Radio />} label="Winter" />
                                    <FormControlLabel value="Summer" control={<Radio />} label="Summer" />
                                </RadioGroup>
                            </FormControl>
                            {/* ▲▲ -------------------- ▲▲ */}

                            <Button
                                variant="contained"
                                color="primary"
                                sx={{ mt: 2 }}
                                onClick={fetchMeteorologicalData}
                            >
                                Get Meteorological Data
                            </Button>
                        </CardContent>

                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default HomeSettingsPage;
