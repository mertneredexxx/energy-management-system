/* eslint-disable prettier/prettier */
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Card, CardContent, Typography, Grid, CircularProgress } from '@mui/material';
import { supabase } from '../../../api/supabaseClient';

/**
 * GraphsPage
 * ----------------------------------------------
 * 1. Fetches the user's `loads` from Supabase.
 * 2. Displays two charts:
 *    a. Bar chart – each load's power rate (device name vs. W).
 *    b. Line chart – 24‑hour timeline of total power demand (W).
 */
export default function GraphsPage() {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function retrieveUser() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      setUserId(user.id);
    }

    retrieveUser();
  }, []);

  useEffect(() => {
    async function fetchLoads() {
      if (!userId) return;

      const { data, error } = await supabase
        .from('loads')
        .select('id, device_name, power_rate, start_time, end_time')
        .eq('user_id', userId);

      if (!error) setLoads(data);
      setLoading(false);
    }

    fetchLoads();
  }, [userId]);

  /* ---------------- helpers -------------------- */
  const barData = loads.map((l) => ({
    name: l.device_name,
    power: l.power_rate
  }));

  const lineData = (() => {
    const hourly = Array(24).fill(0);
    loads.forEach((l) => {
      const p = l.power_rate; // W
      let start = parseInt(l.start_time.substring(0, 2), 10);
      let end = parseInt(l.end_time.substring(0, 2), 10) || 24;
      if (end <= start) end += 24; // crosses midnight

      for (let h = start; h < end; h++) {
        hourly[h % 24] += p;
      }
    });

    return hourly.map((w, idx) => ({
      hour: `${idx.toString().padStart(2, '0')}:00`,
      power: w
    }));
  })();

  /* ---------------- render --------------------- */
  if (loading) {
    return (
      <Grid container justifyContent="center" sx={{ mt: 4 }}>
        <CircularProgress />
      </Grid>
    );
  }

  return (
    <Grid container spacing={3} sx={{ p: 2 }}>
      {/* Bar Chart: Loads vs Power */}
      <Grid item xs={12} md={6}>
        <Card className="shadow-lg rounded-2xl">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Power Rating per Load
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={70} />
                <YAxis label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="power" name="Power (W)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Line Chart: Hourly Load Profile */}
      <Grid item xs={12} md={6}>
        <Card className="shadow-lg rounded-2xl">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Hourly Load Profile (W)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="power" name="Total Power (W)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
