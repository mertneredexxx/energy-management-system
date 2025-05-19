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
import MeteorologicalDatas from './metorologicalChanges';

const HomeSettingsPage = () => {
 
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
        })();
    }, []);



    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
                {/* Energy Generation Section */}
                <Grid item xs={12}>
                    <EnergyGeneration />
                </Grid>

                <Grid item xs={12}>
                    <MeteorologicalDatas />
                </Grid>
            </Grid>
        </Container>
    );
};

export default HomeSettingsPage;
