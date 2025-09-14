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
  FormLabel,
  Box,
  Divider,
  Paper,
  Avatar,
  Stack,
  Chip,
  Alert
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Home as HomeIcon,
  SolarPower as SolarIcon,
  Tune as TuneIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import EnergyGeneration from './energyGenerationPage';
import { supabase } from '../../../api/supabaseClient';
import MeteorologicalDatas from './metorologicalChanges';

const HomeSettingsPage = () => {
  const [settings, setSettings] = useState({
    energy_type: 'solar',
    duration: 'month',
    season: 'winter',
    threshold_kw: 3
  });

  // Fetch (or create) the single home_settings row
  useEffect(() => {
    (async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      // try to grab existing
      let { data, error } = await supabase.from('home_settings').select('*').eq('user_id', user.id).single();

      if (error && error.code === 'PGRST116') {
        // not found → insert defaults
        const { data: inserted } = await supabase
          .from('home_settings')
          .insert({
            user_id: user.id,
            energy_type: settings.energy_type,
            duration: settings.duration,
            season: settings.season,
            threshold_kw: settings.threshold_kw
          })
          .single();
        data = inserted;
      }

      if (data) {
        setSettings({
          energy_type: data.energy_type,
          duration: data.duration,
          season: data.season,
          threshold_kw: data.threshold_kw
        });
      }
    })();
  }, []);

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
          Home Settings
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
          Configure your home energy management preferences
        </Typography>
        <Divider sx={{ mt: 2, width: 60, height: 3, bgcolor: 'primary.main' }} />
      </Box>

      <Grid container spacing={4}>
        {/* Current Settings Overview */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              mb: 3
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                <HomeIcon />
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Current Configuration
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Energy Type
                  </Typography>
                  <Chip
                    label={settings.energy_type}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Duration
                  </Typography>
                  <Chip
                    label={settings.duration}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Season
                  </Typography>
                  <Chip
                    label={settings.season}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Threshold
                  </Typography>
                  <Chip
                    label={`${settings.threshold_kw} kW`}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Energy Generation Section */}
        <Grid item xs={12}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                p: 3,
                background: 'linear-gradient(135deg, #4ecdc4 0%, #20bf6b 100%)',
                color: 'white'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                  <SolarIcon />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Energy Generation Configuration
                </Typography>
              </Box>
            </Box>
            <CardContent sx={{ p: 0 }}>
              <EnergyGeneration />
            </CardContent>
          </Card>
        </Grid>

        {/* Meteorological Data Section */}
        <Grid item xs={12}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                p: 3,
                background: 'linear-gradient(135deg, #a55eea 0%, #8854d0 100%)',
                color: 'white'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                  <TuneIcon />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Meteorological Data Management
                </Typography>
              </Box>
            </Box>
            <CardContent sx={{ p: 0 }}>
              <MeteorologicalDatas />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default HomeSettingsPage;
