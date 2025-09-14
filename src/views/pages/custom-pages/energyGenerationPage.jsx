/* eslint-disable prettier/prettier */
import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControl,
  FormLabel,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  MenuItem,
  Select,
  Grid,
  Box
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { Dialog, DialogTitle, DialogContent, IconButton as MuiIconButton } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '../../../api/supabaseClient';

export default function EnergyGeneration() {
  /* ——— state ——— */
  const [catalog, setCatalog] = useState([]); // all six models
  const [energyGen, setEnergyGen] = useState({
    // form values
    catalogId: '',
    ratedPower: ''
  });
  const [sources, setSources] = useState([]); // rows for this user
  const [openChart, setOpenChart] = useState({
    open: false,
    hourly: [], // [{ hour: '06', kW: 1.2 }, …]
    modelName: ''
  });

  /* ——— initial fetches ——— */
  useEffect(() => {
    (async () => {
      const { data: cat } = await supabase.from('renewable_catalog').select('*').order('renewable_type, default_kw');
      setCatalog(cat);
      fetchSources();
    })();
  }, []);

  async function fetchSources() {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('renewable_selections')
      .select('id, rated_power, catalog_id, catalog:renewable_catalog(model_name, renewable_type)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSources(data || []);
  }
  function buildHourlySeries(shape, ratedKw, renewableType) {
    // ⚙️  Static but realistic constants
    const SUN_HOURS = 5.0; // average peak‑sun‑hours / day (clear‑sky, mid‑lat)
    const WIND_CF = 0.3; // average annual capacity factor for small turbines

    const DAILY_KWH =
      renewableType === 'PV'
        ? ratedKw * SUN_HOURS * 0.75 // 0.75 = performance ratio
        : ratedKw * WIND_CF * 24; // hours per day

    return shape.map((f, i) => ({
      hour: i.toString().padStart(2, '0') + ':00',
      kW: +(f * DAILY_KWH).toFixed(2) // kWh in a 1‑h slot == kW
    }));
  }

  /* ——— handlers ——— */
  const handleModelChange = (e) => {
    const id = Number(e.target.value);
    const row = catalog.find((c) => c.id === id);
    setEnergyGen({ catalogId: id, ratedPower: row?.default_kw ?? '' });
  };

  const handleRatedPowerChange = (e) => setEnergyGen((prev) => ({ ...prev, ratedPower: e.target.value }));

  async function addSource() {
    if (!energyGen.catalogId || !energyGen.ratedPower) return;
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('renewable_selections').insert({
      user_id: user.id,
      catalog_id: energyGen.catalogId,
      renewable_type: catalog.find((c) => c.id === energyGen.catalogId).renewable_type,
      rated_power: Number(energyGen.ratedPower)
    });

    if (!error) {
      setEnergyGen({ catalogId: '', ratedPower: '' });
      fetchSources();
    }
  }

  async function deleteSource(id) {
    const { error } = await supabase.from('renewable_selections').delete().eq('id', id);
    if (!error) fetchSources();
  }

  /* ——— render ——— */
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Energy Generation Sources
        </Typography>

        {/* existing rows ------------------------------------------------- */}
        {sources.length ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Model</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Rated&nbsp;Power&nbsp;(kW)</TableCell>
                <TableCell align="right">Delete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sources.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.catalog.model_name}</TableCell>
                  <TableCell>{row.catalog.renewable_type}</TableCell>
                  <TableCell>{row.rated_power}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => deleteSource(row.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No energy sources added yet.
          </Typography>
        )}

        {/* add new ------------------------------------------------------- */}
        <Typography variant="subtitle1" sx={{ mt: 3 }}>
          Add New Source
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={8}>
            <FormControl fullWidth>
              <FormLabel>Choose Model</FormLabel>
              <Select value={energyGen.catalogId} onChange={handleModelChange} size="small">
                {catalog.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {`${c.model_name} (${c.renewable_type} ${c.default_kw} kW)`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Rated Power (kW)"
              type="number"
              fullWidth
              size="small"
              value={energyGen.ratedPower}
              onChange={handleRatedPowerChange}
              helperText="Override if needed"
            />
          </Grid>
        </Grid>

        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
          onClick={addSource}
          disabled={!energyGen.catalogId || !energyGen.ratedPower}
        >
          Save Source
        </Button>
      </CardContent>
      <Dialog open={openChart.open} onClose={() => setOpenChart({ ...openChart, open: false })} maxWidth="md" fullWidth>
        <DialogTitle>{openChart.modelName} – Hourly Production (kW)</DialogTitle>
        <Box px={3} pb={1}>
          <Typography variant="caption" color="text.secondary">
            Constants used in calculation: SUN HOURS = 5 h/day (PV) · WIND CF = 0.30 (30 %)
          </Typography>
        </Box>

        <DialogContent sx={{ height: 320 }}>
          {openChart.hourly.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={openChart.hourly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis unit=" kW" />
                <Tooltip />
                <Line type="monotone" dataKey="kW" stroke="#8884d8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
