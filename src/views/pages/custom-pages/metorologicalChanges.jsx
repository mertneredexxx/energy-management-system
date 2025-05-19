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
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { supabase } from '../../../api/supabaseClient';

const MeteorologicalDatas = () => {
  // settings pulled from DB
  const [settings, setSettings] = useState({
    energy_type: 'solar',
    duration:    'month',     // 'month'|'year'
    season:      'winter',
    threshold_kw: 3
  });
  const [loadingSettings, setLoadingSettings] = useState(true);

  // the data we fetch from NASA POWER
  const [meteoData, setMeteoData] = useState([]);

  // 1) load or create the home_settings row
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { data, error } = await supabase
        .from('home_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: inserted } = await supabase
          .from('home_settings')
          .insert({
            user_id:      user.id,
            ...settings
          })
          .single();
        data = inserted;
      }

      if (data) {
        setSettings({
          energy_type: data.energy_type,
          duration:    data.duration,
          season:      data.season,
          threshold_kw: data.threshold_kw
        });
      }
      setLoadingSettings(false);
    })();
  }, []);

  // 2) persist any change back to Supabase immediately
  const upsertSetting = async (changes) => {
    setSettings(s => ({ ...s, ...changes }));
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('home_settings')
      .upsert({ user_id: user.id, ...settings, ...changes }, { onConflict: 'user_id' });
  };

  // 3) fetch real meteorological data from NASA POWER
  const fetchMeteorologicalData = async () => {
    // define parameter key
    const param =
      settings.energy_type === 'solar'
        ? 'ALLSKY_SFC_SW_DWN'    // daily irradiance (MJ/m²)
        : 'WS2M';                // wind speed @2m (m/s)

    // build date strings
    const end   = new Date();
    const start = new Date();
    if (settings.duration === 'month') {
      start.setDate(end.getDate() - 30);
    } else {
      start.setFullYear(end.getFullYear() - 1);
    }

    const formatDate = d => d.toISOString().slice(0,10).replace(/-/g,'');
    const url = `https://power.larc.nasa.gov/api/temporal/daily/point` +
      `?parameters=${param}` +
      `&community=RE` + 
      `&start=${formatDate(start)}` +
      `&end=${formatDate(end)}` +
      `&latitude=41.0082&longitude=28.9784` +       // default: Istanbul
      `&format=JSON`;

    try {
        const res = await fetch(url);
        const json = await res.json();
        const fillValue = json.header.fill_value;                          // e.g. -999
        const values = json.properties.parameter[param];

        const dataArray = Object.entries(values)
            // drop any “no-data” fill values
            .filter(([, val]) => val !== fillValue)
            // sort by date key
            .sort(([a], [b]) => a.localeCompare(b))
            // map "YYYYMMDD" → "MM/DD" and round
            .map(([date, val]) => ({
                date: `${date.slice(4, 6)}/${date.slice(6, 8)}`,
                value: +val.toFixed(2)
            }));
      setMeteoData(dataArray);
    } catch (err) {
      console.error('Error fetching POWER data', err);
    }
  };

  if (loadingSettings) return null;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>

        {/* ... your existing sections ... */}

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Home & Meteorological Settings
              </Typography>

              {/* Energy Type */}
              <FormControl fullWidth sx={{ mt: 2 }}>
                <FormLabel>Energy Type</FormLabel>
                <RadioGroup
                  row
                  value={settings.energy_type}
                  onChange={e => upsertSetting({ energy_type: e.target.value })}
                >
                  <FormControlLabel value="solar" control={<Radio />} label="Solar" />
                  <FormControlLabel value="wind"  control={<Radio />} label="Wind" />
                </RadioGroup>
              </FormControl>

              {/* Duration */}
              <FormControl fullWidth sx={{ mt: 2 }}>
                <FormLabel>Duration</FormLabel>
                <RadioGroup
                  row
                  value={settings.duration}
                  onChange={e => upsertSetting({ duration: e.target.value })}
                >
                  <FormControlLabel value="month" control={<Radio />} label="One Month" />
                  <FormControlLabel value="year"  control={<Radio />} label="One Year" />
                </RadioGroup>
              </FormControl>

              {/* Season */}
              <FormControl fullWidth sx={{ mt: 2 }}>
                <FormLabel>Season</FormLabel>
                <RadioGroup
                  row
                  value={settings.season}
                  onChange={e => upsertSetting({ season: e.target.value })}
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
                onChange={e => upsertSetting({ threshold_kw: +e.target.value })}
              />

              <Button
                variant="contained"
                sx={{ mt: 3 }}
                onClick={fetchMeteorologicalData}
              >
                Apply & Fetch Data
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* 4) Meteorological Chart */}
        {meteoData.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {settings.energy_type === 'solar' ? 'Daily Solar Irradiance' : 'Daily Wind Speed'}  
                  &nbsp;({settings.duration === 'month' ? 'Last 30 days' : 'Last 365 days'})
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={meteoData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={d => d.slice(4)} />
                    <YAxis
                      unit={settings.energy_type === 'solar' ? ' MJ/m²' : ' m/s'}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={
                        settings.energy_type === 'solar'
                          ? 'Irradiance'
                          : 'Wind Speed'
                      }
                      dot={false}
                      stroke={
                        settings.energy_type === 'solar'
                          ? '#f5a623'
                          : '#357edd'
                      }
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default MeteorologicalDatas;
