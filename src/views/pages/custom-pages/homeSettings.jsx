/* eslint-disable prettier/prettier */
import React, { useEffect, useState } from 'react';
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
import { supabase } from '../../../api/supabaseClient';

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
    const [settings, setSettings] = useState({
        energy_type: 'solar',
        duration: 'month',
        season: 'winter',
        threshold_kw: 3,
    });

    // Fetch (or create) the single home_settings row
    useEffect(() => {
        (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            // try to grab existing
            let { data, error } = await supabase
                .from('home_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                // not found → insert defaults
                const { data: inserted } = await supabase.from('home_settings').insert({
                    user_id: user.id,
                    energy_type: settings.energy_type,
                    duration: settings.duration,
                    season: settings.season,
                    threshold_kw: settings.threshold_kw,
                }).single();
                data = inserted;
            }

            if (data) {
                setSettings({
                    energy_type: data.energy_type,
                    duration: data.duration,
                    season: data.season,
                    threshold_kw: data.threshold_kw,
                });
            }

            setLoading(false);
        })();
    }, []);

    // whenever one field changes, write back
    const upsertSetting = async (changes) => {
        setSettings((s) => ({ ...s, ...changes }));
        const {
            data: { user },
        } = await supabase.auth.getUser();
        await supabase.from('home_settings').upsert(
            {
                user_id: user.id,
                ...settings,
                ...changes,
            },
            { onConflict: 'user_id' }
        );
    };
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

                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Home & Meteorological Settings
                            </Typography>

                            {/* Energy Type */}
                            <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
                                <FormLabel component="legend">Energy Type</FormLabel>
                                <RadioGroup
                                    row
                                    value={settings.energy_type}
                                    onChange={(e) => upsertSetting({ energy_type: e.target.value })}
                                >
                                    <FormControlLabel value="solar" control={<Radio />} label="Solar" />
                                    <FormControlLabel value="wind" control={<Radio />} label="Wind" />
                                </RadioGroup>
                            </FormControl>

                            {/* Duration */}
                            <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
                                <FormLabel component="legend">Duration</FormLabel>
                                <RadioGroup
                                    row
                                    value={settings.duration}
                                    onChange={(e) => upsertSetting({ duration: e.target.value })}
                                >
                                    <FormControlLabel value="month" control={<Radio />} label="One Month" />
                                    <FormControlLabel value="year" control={<Radio />} label="One Year" />
                                </RadioGroup>
                            </FormControl>

                            {/* Season */}
                            <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
                                <FormLabel component="legend">Season</FormLabel>
                                <RadioGroup
                                    row
                                    value={settings.season}
                                    onChange={(e) => upsertSetting({ season: e.target.value })}
                                >
                                    <FormControlLabel value="winter" control={<Radio />} label="Winter" />
                                    <FormControlLabel value="summer" control={<Radio />} label="Summer" />
                                </RadioGroup>
                            </FormControl>

                            {/* Threshold */}
                            <TextField
                                label="Peak Threshold (kW)"
                                type="number"
                                fullWidth
                                sx={{ mt: 2 }}
                                value={settings.threshold_kw}
                                onChange={(e) => upsertSetting({ threshold_kw: parseFloat(e.target.value) })}
                            />

                            <Button variant="contained" sx={{ mt: 3 }} onClick={() => {/* ... */ }}>
                                Apply & Fetch Data
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default HomeSettingsPage;
