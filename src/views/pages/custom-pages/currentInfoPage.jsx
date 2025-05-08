/* eslint-disable prettier/prettier */
import { useEffect, useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Grid,
    CircularProgress,
    Button,
    Snackbar,
    Alert,
} from '@mui/material';
import { supabase } from '../../../api/supabaseClient';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';

/* -------------------------------------------------------------
 * InfoPage – dynamic summary + combined hourly graph
 * -------------------------------------------------------------
 * 1. Fetch current user's loads → build hourly load profile (kW).
 * 2. Fetch renewable selections (w/ catalog.hourly_shape) →
 *    build hourly production profile (kW).
 * 3. Show two tables (daily energy) and one line chart (hour‑by‑hour kW).
 * ------------------------------------------------------------- */

export default function InfoPage() {
    const [loading, setLoading] = useState(true);
    const [loadRows, setLoadRows] = useState([]);
    const [prodRows, setProdRows] = useState([]);
    const [hourSeries, setHourSeries] = useState([]);          // before + after
    const [totals, setTotals] = useState({ load: 0, prod: 0, net: 0 });
    const [snack, setSnack] = useState({ open: false, msg: '', sev: 'info' });
    const [preview, setPreview] = useState(null); // null or { series: [...], updates: [...] }

    /* ---------- constants (edit if you wish) ---------- */
    const SUN_HOURS = 5.0;
    const WIND_CF = 0.30;
    const PR = 0.75;
    const GRID_LIMIT = 3;       // 3 kW apartment flat

    /* ---------- helper to (de)apply a load to array ---- */
    const addLoad = (arr, load, sign = +1) => {
        const p = (load.power_rate / 1000) * sign;
        let s = parseInt(load.start_time.slice(0, 2), 10);
        let e = parseInt(load.end_time.slice(0, 2), 10) || 24;
        if (e <= s) e += 24;
        for (let h = s; h < e; h++) arr[h % 24] += p;
    };

    /* ---------- load everything on mount --------------- */
    useEffect(() => { reload(); }, []);

    async function reload() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const loadHourly = Array(24).fill(0);
        const prodHourly = Array(24).fill(0);

        /* loads */
        const { data: loads = [] } = await supabase.from('loads').select('*').eq('user_id', user.id);
        let loadKwhTotal = 0;
        const loadTbl = loads.map(l => {
            addLoad(loadHourly, l, +1);
            const p = l.power_rate / 1000;
            let s = parseInt(l.start_time.slice(0, 2), 10);
            let e = parseInt(l.end_time.slice(0, 2), 10) || 24;
            if (e <= s) e += 24;
            const hrs = e - s;
            const kwh = p * hrs;
            loadKwhTotal += kwh;
            return { id: l.id, name: l.device_name, power: p, hrs, kwh: kwh.toFixed(2), priority: l.priority, start_time: l.start_time, end_time: l.end_time, power_rate: l.power_rate };
        });

        /* renewables */
        const { data: sels = [] } = await supabase
            .from('renewable_selections')
            .select(`id, rated_power, catalog:renewable_catalog(model_name, renewable_type, hourly_shape)`)
            .eq('user_id', user.id);

        let prodKwhTotal = 0;
        const prodTbl = sels.map(r => {
            const type = r.catalog.renewable_type;
            const rated = Number(r.rated_power);
            const dailyKwh = type === 'PV'
                ? rated * SUN_HOURS * PR
                : rated * WIND_CF * 24;
            prodKwhTotal += dailyKwh;
            r.catalog.hourly_shape.forEach((f, idx) => prodHourly[idx] += f * dailyKwh);
            return { model: r.catalog.model_name, type, rated, kwh: dailyKwh.toFixed(2) };
        });

        const { data: [ev] = [] } = await supabase
            .from('ev_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
        const BATT         = 52;                      // kWh capacity
        const socStart     = (ev.initial_soc / 100) * BATT;
        const MIN_SOC      = 0.25 * BATT;
        const MAX_SOC      = 0.75 * BATT;
        let soc            = socStart;
        const evHr         = Array(24).fill(0);
        
        // a) grid only 22:00–06:00 at ev.charging_rate
        for (let h=22; h<24; h++) {
          const charge = Math.min(ev.charging_rate, MAX_SOC - soc);
          evHr[h] = +charge.toFixed(2);
          soc   += charge;
        }
        for (let h=0; h<6; h++) {
          const charge = Math.min(ev.charging_rate, MAX_SOC - soc);
          evHr[h] = +charge.toFixed(2);
          soc   += charge;
        }
        
        // b) renewable only 06:00–08:00
        for (let h=6; h<8; h++) {
          const spare  = Math.max(0, prodHourly[h] - loadHourly[h]);
          const charge = Math.min(ev.charging_rate, spare, MAX_SOC - soc);
          evHr[h] = +charge.toFixed(2);
          soc   += charge;
        }
        
        // c) EV leaves home at 8h, SoC drops by 30%
        soc -= (ev.initial_soc - ev.final_soc) / 100 * BATT;
        
        // d) discharge 18:00–22:00 at 1 kW
        for (let h=18; h<22; h++) {
          const canDis = Math.min(1, soc - MIN_SOC);
          evHr[h] = -canDis;
          soc   -= canDis;
        }



        // 1) incorporate EV into the load curve
        for (let h = 0; h < 24; h++) {
            loadHourly[h] += evHr[h];
        }

        // 2) optionally store EV in your chart data too:
        const baseSeries = loadHourly.map((l, i) => ({
            hour: `${String(i).padStart(2, '0')}:00`,
            Load: +l.toFixed(2),
            EV: +evHr[i].toFixed(2),          // new
            Production: +prodHourly[i].toFixed(2)
        }));

        setLoadRows(loadTbl);
        setProdRows(prodTbl);
        setHourSeries(baseSeries);           // initial (no shifted yet)
        setTotals({
            load: loadKwhTotal.toFixed(2),
            prod: prodKwhTotal.toFixed(2),
            net: (prodKwhTotal - loadKwhTotal).toFixed(2)
        });
        setLoading(false);
    }

    /* ---------- run load shifting ---------------------- */
    /**
 * runShifting
 * -------------
 * Preview-only load shifting. Finds all priority 2+3 loads,
 * removes them from the hourly demand array, then reinserts
 * each load into the earliest contiguous slot where demand + load
 * ≤ (Production + GRID_LIMIT). Updates the chart but does NOT
 * write to the database until “Apply Shift” is clicked.
 */
async function runShifting() {
    if (preview) return;  // already in preview
  
    // 1) Build capacity curve: Production[h] + GRID_LIMIT
    const capacity = hourSeries.map(p =>
        GRID_LIMIT + p.Production - Math.max(0, p.EV)
      );
      
  
    // 2) Base load curve (kW)
    const baseLoad = hourSeries.map(p => p.Load);
  
    // 3) Quick exit if no peaks
    if (baseLoad.every((kW, h) => kW <= capacity[h])) {
      setSnack({ open: true, msg: 'No peaks – nothing to shift.', sev: 'info' });
      return;
    }
  
    // Helper: remove/add a load interval (start/end in hours, power_rate in W)
    const addInterval = (arr, { power_rate, start, end }, sign) => {
      const p = (power_rate / 1000) * sign; // to kW
      let s = start, e = end;
      if (e <= s) e += 24;                  // wrap midnight
      for (let h = s; h < e; h++) arr[h % 24] += p;
    };
  
    // Helper: compute duration hours from time strings
    const findDuration = (start, end) => {
      let s = parseInt(start.slice(0,2),10);
      let e = parseInt(end  .slice(0,2),10) || 24;
      return e <= s ? e + 24 - s : e - s;
    };
  
    // 4) Prepare mutable arrays
    const shiftedLoadHr = [...baseLoad];
    const updates       = [];
    let movedCount      = 0;
  
    // 5) Sort flexible loads by priority desc, then power desc
    const flexLoads = [...loadRows]
      .filter(l => l.priority > 1)
      .sort((a,b) => b.priority - a.priority || b.power - a.power);
  
    // 6) Greedy placement loop
    for (const l of flexLoads) {
      // Remove original
      addInterval(
        shiftedLoadHr,
        {
          power_rate: l.power_rate,
          start: parseInt(l.start_time.slice(0,2),10),
          end:   parseInt(l.end_time  .slice(0,2),10) || 24
        },
        -1
      );
  
      const duration = findDuration(l.start_time, l.end_time);
      const p_kW     = l.power;
  
      // Try every possible start hour 0–23
      for (let tryStart = 0; tryStart < 24; tryStart++) {
        let fits = true;
        for (let h = 0; h < duration; h++) {
          const idx = (tryStart + h) % 24;
          if (shiftedLoadHr[idx] + p_kW > capacity[idx]) { fits = false; break; }
        }
        if (!fits) continue;
  
        // Found a slot—add it back
        addInterval(
          shiftedLoadHr,
          { power_rate: l.power_rate, start: tryStart, end: (tryStart + duration) % 24 },
          +1
        );
  
        // Record update for “Apply Shift”
        updates.push({
          id   : l.id,
          start: `${String(tryStart).padStart(2,'0')}:00`,
          end  : `${String((tryStart + duration) % 24).padStart(2,'0')}:00`
        });
        movedCount++;
        break;
      }
    }
  
    // 7) Build preview series with the new shifted load curve
    const previewSeries = hourSeries.map((p, h) => ({
      ...p,
      ShiftedLoad: +shiftedLoadHr[h].toFixed(2)
    }));
  
    // 8) Update state for chart preview
    setHourSeries(previewSeries);
    setPreview({ series: previewSeries, updates });
    setSnack({
      open: true,
      msg : `Shifted ${movedCount} load${movedCount===1?'':'s'} – preview only.`,
      sev : 'success'
    });
  }
  

    async function applyShift() {
        if (!preview) return;
        await Promise.all(
            preview.updates.map(u =>
                supabase.from('loads')
                    .update({ start_time: u.start, end_time: u.end })
                    .eq('id', u.id)
            )
        );
        setSnack({ open: true, msg: `Applied ${preview.updates.length} change(s).`, sev: 'success' });
        setPreview(null);
        reload();           // refetch from DB to show committed schedule
    }


    if (loading) return <CircularProgress />;

    return (
        <>
            <Grid container spacing={2}>
                {/* Tables */}
                <Grid item xs={12} md={6}>
                    <Card><CardContent>
                        <Typography variant="h6" gutterBottom>Daily Load Profile</Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Device</TableCell>
                                    <TableCell>Power (kW)</TableCell>
                                    <TableCell>Hours On</TableCell>
                                    <TableCell>Energy (kWh)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loadRows.map((r, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{r.name}</TableCell>
                                        <TableCell>{r.power}</TableCell>
                                        <TableCell>{r.hrs}</TableCell>
                                        <TableCell>{r.kwh}</TableCell>
                                    </TableRow>))}
                                <TableRow sx={{ fontWeight: 'bold' }}>
                                    <TableCell>Total</TableCell><TableCell /><TableCell />
                                    <TableCell>{totals.load}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent></Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card><CardContent>
                        <Typography variant="h6" gutterBottom>Daily Renewable Production</Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Model</TableCell><TableCell>Type</TableCell>
                                    <TableCell>Rated (kW)</TableCell><TableCell>Energy (kWh)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {prodRows.map((p, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{p.model}</TableCell>
                                        <TableCell>{p.type}</TableCell>
                                        <TableCell>{p.rated}</TableCell>
                                        <TableCell>{p.kwh}</TableCell>
                                    </TableRow>))}
                                <TableRow sx={{ fontWeight: 'bold' }}>
                                    <TableCell>Total</TableCell><TableCell /><TableCell />
                                    <TableCell>{totals.prod}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                        <Typography sx={{ mt: 2 }}>
                            Net Balance: {totals.net} kWh {totals.net >= 0 ? '(Surplus)' : '(Deficit)'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Constants · SUN_HOURS = 5 h/day · WIND_CF = 0.30 · PR = 0.75
                        </Typography>
                    </CardContent></Card>
                </Grid>

                {/* Combined hourly graph + shift button */}
                <Grid item xs={12}>
                    <Card><CardContent>
                        <Typography variant="h6" gutterBottom>Hourly Load vs Production</Typography>
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={hourSeries}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="hour" />
                                <YAxis unit=" kW" />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="Load" stroke="#f44336" dot={false} />
                                <Line type="monotone" dataKey="ShiftedLoad" stroke="#ff9800" dot={false} />
                                <Line type="monotone" dataKey="EV" stroke="#2196f3" dot={false} />
                                <Line type="monotone" dataKey="Production" stroke="#4caf50" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                        <Button
                            variant="outlined"
                            sx={{ mt: 2, mr: 2 }}
                            onClick={runShifting}
                            disabled={!!preview}            // disable when preview active
                        >
                            Run Load Shifting
                        </Button>

                        {preview && (
                            <Button
                                variant="contained"
                                color="primary"
                                sx={{ mt: 2 }}
                                onClick={applyShift}
                            >
                                Apply Shift
                            </Button>
                        )}
                    </CardContent></Card>
                </Grid>
            </Grid>
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}>
                <Alert severity={snack.sev} variant="filled" sx={{ width: '100%' }}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </>
    );
}
