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
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    DialogActions,
    Box,
    Chip,
    Avatar,
    Stack,
    Divider,
    Paper,
    Tooltip,
    IconButton,
    Zoom
} from '@mui/material';
import {
    Power as PowerIcon,
    SolarPower as SolarIcon,
    ShowChart as ShowChartIcon,
    Save as SaveIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    BatteryFull as BatteryIcon,
    ElectricCar as ElectricCarIcon,
    Home as HomeIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { supabase } from '../../../api/supabaseClient';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ReferenceLine,
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
    /* ---------- constants (edit if you wish) ---------- */
    const GRID_LIMIT = 3;       // 3 kW apartment flat

    const [threshold, setThreshold] = useState(GRID_LIMIT);
    const [saving, setSaving] = useState(false);
    const [homeSettings, setHomeSettings] = useState(GRID_LIMIT);
    const [loading, setLoading] = useState(true);
    const [loadRows, setLoadRows] = useState([]);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportName, setReportName] = useState('');
    const [reportDesc, setReportDesc] = useState('');
    const [prodRows, setProdRows] = useState([]);
    const [hourSeries, setHourSeries] = useState([]);          // before + after
    const [totals, setTotals] = useState({ load: 0, prod: 0, net: 0 });
    const [snack, setSnack] = useState({ open: false, msg: '', sev: 'info' });
    const [preview, setPreview] = useState(null); // null or { series: [...], updates: [...] }
    const [costs, setCosts] = useState({ before: 0, after: 0 });
    const [SUN_HOURS, setSunHours] = useState(5.0);
    const [WIND_CF, setWindCf] = useState(0.30);
    const [PR, setPr] = useState(0.75);
    const [meteoAvg, setMeteoAvg] = useState({
        avgIrrMonth: null,
        avgWindMonth: null,
        annIrrYear: null,
        annWindYear: null
    });

    const [priceHr, setPriceHr] = useState(Array.from({ length: 24 }, (_, h) => {
        if (homeSettings?.season === 'summer') {
            if (h < 7 || h >= 22) return 0.30;
            if (h < 17) return 1.00;
            return 1.60;
        } else {
            if (h < 6 || h >= 22) return 0.35;
            if (h < 17) return 0.90;
            return 1.40;
        }
    }));

    useEffect(() => {
        setPriceHr(Array.from({ length: 24 }, (_, h) => {
            if (homeSettings?.season === 'summer') {
                if (h < 7 || h >= 22) return 0.30;
                if (h < 17) return 1.00;
                return 1.60;
            } else {
                if (h < 6 || h >= 22) return 0.35;
                if (h < 17) return 0.90;
                return 1.40;
            }
        }));
    }, [homeSettings]);

    const openReportDialog = () => setReportModalOpen(true);
    const closeReportDialog = () => {
        setReportModalOpen(false);
        setReportName('');
        setReportDesc('');
    };


    async function saveReport() {
        if (!reportName.trim() || !reportDesc.trim()) return;
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        // 1) grab current home_settings for this user
        const { data: hs, error: hsErr } = await supabase
            .from('home_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();
        if (hsErr) {
            console.error(hsErr);
            setSnack({ open: true, msg: 'Failed to load home settings', sev: 'error' });
            setSaving(false);
            return;
        }

        const { data: [ev] = [] } = await supabase
            .from('ev_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);


        // build scheduleRows exactly as in your component
        const scheduleRows = loadRows.map(l => {
            const u = preview?.updates.find(u => u.id === l.id);
            const oldStart = l.is_all_day ? '00:00' : l.start_time;
            const oldEnd = l.is_all_day ? '24:00' : l.end_time;
            const newStart = u ? u.start : oldStart;
            const newEnd = u ? u.end : oldEnd;

            return {
                id: l.id,
                name: l.name,
                oldStart,
                oldEnd,
                newStart,
                newEnd,
                isAllDay : l.is_all_day
            };
        });

        // 2) build report payload
        const payload = {
            user_id: user.id,
            name: reportName,
            description: reportDesc,                    // you could prompt for this
            season: hs.season,
            threshold_kw: hs.threshold_kw,
            home_settings: hs,
            loads: loadRows,
            renewables: prodRows,
            ev_session: ev,                    // the latest ev you fetched
            hour_series: hourSeries,
            hour_series_shifted: preview?.series ?? null,
            costs: costs,
            daily_total_load: totals.load,      // kWh
            total_renewable: totals.prod,      // kWh
            schedule_rows: scheduleRows    // ← add this
        };

        // 3) insert
        const { error } = await supabase
            .from('reports')
            .insert(payload);
        if (error) {
            console.error(error);
            setSnack({ open: true, msg: 'Failed to save report', sev: 'error' });
        } else {
            closeReportDialog();
            setSnack({ open: true, msg: 'Report saved!', sev: 'success' });
        }
        setSaving(false);
    }


    /* ---------- helper to (de)apply a load to array ---- */
    const addLoad = (arr, load, sign = +1) => {
        const p = (load.power_rate / 1000) * sign;

        if (load.is_all_day) {
            // run 24h
            for (let h = 0; h < 24; h++) arr[h] += p;
            return;
        }

        // … your existing start/end parsing …
        let s = parseInt(load.start_time.slice(0, 2), 10);
        let e = parseInt(load.end_time.slice(0, 2), 10) || 24;
        if (e <= s) e += 24;
        for (let h = s; h < e; h++) arr[h % 24] += p;
    };


    /* ---------- load everything on mount --------------- */
    useEffect(() => { 
        async function loadData() {
            await reload();
        }
        loadData();
    }, []);

    async function reload() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const loadHourly = Array(24).fill(0);
        const prodHourly = Array(24).fill(0);

        /* threshold */
        const { data: hs } = await supabase
            .from('home_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (hs?.threshold_kw != null) {
            setThreshold(hs.threshold_kw);
        }

        const season = hs?.season || 'winter';
        const duration = hs?.duration;
        setHomeSettings(hs);    // new state if you need it elsewhere
        season === 'summer' ? setSunHours(6.5) : setSunHours(5.0);
        season === 'summer' ? setWindCf(0.25) : setWindCf(0.30);


        /* meteo data */
        const { data: meteoRows = [] } = await supabase
            .from('meteorological_data')           // your table name
            .select('data_type, duration, data')
            .eq('user_id', user.id);

        // reduce into a lookup:
        const lookup = {};
        meteoRows.forEach(r => {
            if (r.data_type === 'Solar' && r.duration === 'One Month')
                lookup.avgIrrMonth = r.data.average_irradiance;
            if (r.data_type === 'Wind' && r.duration === 'One Month')
                lookup.avgWindMonth = r.data.average_wind_speed;
            if (r.data_type === 'Solar' && r.duration === 'One Year')
                lookup.annIrrYear = r.data.annual_irradiance;
            if (r.data_type === 'Wind' && r.duration === 'One Year')
                lookup.annWindYear = r.data.annual_wind_speed;
        });
        setMeteoAvg(lookup);

        /* loads */
        const { data: loads = [] } = await supabase.from('loads').select('*').eq('user_id', user.id);
        let loadKwhTotal = 0;
        const loadTbl = loads.map(l => {
            // 1) push into the 24-slot array
            addLoad(loadHourly, l, +1);

            const p = l.power_rate / 1000;
            // 2) override for all-day
            const hrs = l.is_all_day
                ? 24
                : (() => {
                    let s = parseInt(l.start_time.slice(0, 2), 10);
                    let e = parseInt(l.end_time.slice(0, 2), 10) || 24;
                    if (e <= s) e += 24;
                    return e - s;
                })();
            const kwh = p * hrs;
            loadKwhTotal += kwh;

            return {
                id: l.id,
                name: l.device_name,
                power: p,
                hrs,
                kwh: kwh.toFixed(2),
                priority: l.priority,
                start_time: l.start_time,
                end_time: l.end_time,
                power_rate: l.power_rate,
                is_all_day: l.is_all_day        // carry the flag through
            };
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
            // ← NEW: pick correct avg based on type & settings.duration
            const factor = type === 'PV'
                ? (duration === 'month'
                    ? lookup.avgIrrMonth
                    : lookup.annIrrYear)
                : (duration === 'month'
                    ? lookup.avgWindMonth
                    : lookup.annWindYear);

            // now dailyKwh = rated_kW * average_kWh_per_kW_per_day
            const dailyKwh = rated * factor;
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

        const BATT = 52;                     // kWh
        let soc = (ev.initial_soc / 100) * BATT;
        const MIN_SOC = 0.25 * BATT;
        const MAX_SOC = 0.75 * BATT;
        const evHr = Array(24).fill(0);

        // a) grid-charging 22:00–06:00 @ ev.charging_rate
        for (let h = 22; h < 24; h++) {
            const c = Math.min(ev.charging_rate, MAX_SOC - soc);
            evHr[h] = c; soc += c;
        }
        for (let h = 0; h < 6; h++) {
            const c = Math.min(ev.charging_rate, MAX_SOC - soc);
            evHr[h] = c; soc += c;
        }

        // b) renewables-only charging 06:00–08:00
        for (let h = 6; h < 8; h++) {
            const spare = Math.max(0, prodHourly[h] - loadHourly[h]);
            const c = Math.min(ev.charging_rate, spare, MAX_SOC - soc);
            evHr[h] = c; soc += c;
        }

        // c) car leaves at 08:00 → SoC drops by 30%
        soc -= (ev.initial_soc - ev.final_soc) / 100 * BATT;

        // d) discharge 18:00–22:00 @ 1 kW
        for (let h = 18; h < 22; h++) {
            const d = Math.min(1, soc - MIN_SOC);
            evHr[h] = -d; soc -= d;
        }

        // 1) merge EV into the load curve:
        for (let h = 0; h < 24; h++) {
            loadHourly[h] += evHr[h];
        }

        // 2) include EV in your chart data:
        const baseSeries = loadHourly.map((l, i) => ({
            hour: `${String(i).padStart(2, '0')}:00`,
            Load: +l.toFixed(2),
            EV: +evHr[i].toFixed(2),           // ← here
            Production: +prodHourly[i].toFixed(2)
        }));

        setHourSeries(baseSeries);
        const costBefore = baseSeries.reduce(
            (sum, { Load, Production, hour }) =>
                sum + Math.max(Load - Production, 0) * priceHr[+hour.slice(0, 2)],
            0
        );

        setCosts({ before: +costBefore.toFixed(2), after: +costBefore.toFixed(2) });
        setLoadRows(loadTbl);
        setProdRows(prodTbl);
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
        if (preview) return; // only one preview at a time

        const THRESHOLD = threshold; // in kW

        // 1) capacity = Production + threshold
        const capacity = hourSeries.map(p => p.Production + THRESHOLD);

        // 2) flat array of today’s load
        const baseLoad = hourSeries.map(p => p.Load);

        // — NEW: compute cost before shift —
        const costBefore = hourSeries.reduce((sum, { Load, Production, hour }) => {
            const hr = parseInt(hour.slice(0, 2), 10);
            const tariff = priceHr[hr];
            return sum + Math.max(Load - Production, 0) * tariff;
        }, 0);


        // 3) check if any peak‐hour violation (17–21)
        const peakHrs = [17, 18, 19, 20, 21];
        if (!peakHrs.some(h => baseLoad[h] > capacity[h])) {
            setSnack({ open: true, msg: 'No threshold violations – nothing to shift.', sev: 'info' });
            return;
        }

        // 4) build mutable copy & helpers
        const shiftedHr = [...baseLoad];
        const addInterval = (arr, { power_rate, start, end }, sign) => {
            const p = (power_rate / 1000) * sign;
            let s = start, e = end;
            if (e <= s) e += 24;
            for (let h = s; h < e; h++) arr[h % 24] += p;
        };
        const getDuration = (s, e) => {
            const start = parseInt(s.slice(0, 2), 10);
            let end = parseInt(e.slice(0, 2), 10) || 24;
            return end <= start ? end + 24 - start : end - start;
        };

        // 5) only non‐all‐day, priority>1
        const flex = loadRows
            .filter(l => l.priority > 1 && !l.is_all_day)
            .sort((a, b) => b.priority - a.priority);

        const updates = [];
        const wrapSet = new Set();
        let moved = 0;

        // 6) strip each out and re‐insert at 22:00 (ignore capacity for shift)
        for (let l of flex) {
            // remove its original interval
            const orig = {
                power_rate: l.power_rate,
                start: parseInt(l.start_time.slice(0, 2), 10),
                end: parseInt(l.end_time.slice(0, 2), 10) || 24
            };
            addInterval(shiftedHr, orig, -1);

            // compute duration & new slot
            const dur = getDuration(l.start_time, l.end_time);
            const newStart = 22;
            const newEnd = (newStart + dur) % 24;

            // track wrap-around hours
            if (newEnd <= newStart) {
                for (let h = 0; h < newEnd +1 ; h++) {
                    wrapSet.add(h);
                }
            }

            // re-insert at 22:00
            addInterval(
                shiftedHr,
                { power_rate: l.power_rate, start: newStart, end: newEnd },
                +1
            );
            updates.push({
                id: l.id,
                start: '22:00',
                end: String(newEnd).padStart(2, '0') + ':00'
            });
            moved++;
        }

        // 7) build preview series for today
        const previewSeries = [];
        for (let h = 0; h < 24; h++) {
            const loadVal = baseLoad[h];
            const shiftedVal = (h >= 0 && h <= 6)
                // off-peak 00–06: keep original
                ? loadVal
                // otherwise use your shifted result
                : +shiftedHr[h].toFixed(2);

            previewSeries.push({
                hour: `${String(h).padStart(2, '0')}:00`,
                Load: loadVal,
                ShiftedLoad: shiftedVal,
                EV: hourSeries[h].EV,
                Production: hourSeries[h].Production
            });
        }

        // 8) append tomorrow’s wrap‐around hours with “(T)”
        Array.from(wrapSet)
            .sort((a, b) => a - b)
            .forEach(h => {
                previewSeries.push({
                    hour: `${String(h).padStart(2, '0')}:00 (T)`,
                    Load: baseLoad[h],
                    ShiftedLoad: +shiftedHr[h].toFixed(2),
                    EV: hourSeries[h].EV,
                    Production: hourSeries[h].Production
                });
            });


        // — NEW: compute cost after shift —
        const costAfter = previewSeries.reduce((sum, { ShiftedLoad, Production, hour }) => {
            // strip out the "(T)" if present
            const hr = parseInt(hour.slice(0, 2), 10);
            const tariff = priceHr[hr];
            return sum + Math.max(ShiftedLoad - Production, 0) * tariff;
        }, 0);
        // 9) stash into state & notify
        setHourSeries(previewSeries);
        setPreview({ series: previewSeries, updates });
        setCosts({ before: +costBefore.toFixed(2), after: +costAfter.toFixed(2) });
        setSnack({
            open: true,
            msg: `Shifted ${moved} load${moved === 1 ? '' : 's'} to 22:00.`,
            sev: 'success'
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

    const scheduleRows = loadRows.map(l => {
        const u = preview?.updates.find(u => u.id === l.id);
        const oldStart = l.is_all_day ? '00:00' : l.start_time;
        const oldEnd = l.is_all_day ? '24:00' : l.end_time;
        const newStart = u
            ? u.start
            : oldStart;
        const newEnd = u
            ? u.end
            : oldEnd;

        return {
            id: l.id,
            name: l.name,
            oldStart,
            oldEnd,
            newStart,
            newEnd
        };
    });




    if (loading) return (
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '50vh',
            flexDirection: 'column'
        }}>
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
                Loading energy data...
            </Typography>
        </Box>
    );

    return (
        <Box sx={{ p: 3 }}>
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
                    Energy Analysis Dashboard
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                    Real-time energy consumption and production insights
                </Typography>
                <Divider sx={{ mt: 2, width: 60, height: 3, bgcolor: 'primary.main' }} />
            </Box>

            <Grid container spacing={3}>
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
                            Constants · SUN_HOURS = {SUN_HOURS} h/day · WIND_CF = {WIND_CF} · PR = {PR}
                        </Typography>
                    </CardContent></Card>
                </Grid>
                      {preview && (             
                <Grid item xs={12}>
                    <Card sx={{ mb: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle1">
                                <strong>Tariff (₺/kWh):</strong>{' '}
                                {homeSettings?.season === 'summer'
                                    ? 'Off-Peak 00–07 & 22–24=0.30 · Mid-Peak 07–17=1.00 · Peak 17–22=1.60'
                                    : 'Off-Peak 00–06 & 22–24=0.35 · Mid-Peak 06–17=0.90 · Peak 17–22=1.40'}
                            </Typography>
                            <Typography variant="subtitle1">Cost Before Shift: ₺{costs.before.toFixed(2)}</Typography>
                            <Typography variant="subtitle1">Cost After  Shift: ₺{costs.after.toFixed(2)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                )}

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
                                {/* horizontal threshold line */}
                                <ReferenceLine
                                    y={threshold}
                                    stroke="#333"
                                    strokeDasharray="5 5"
                                    label={{ position: 'right', value: `${threshold} kW`, fill: '#333' }}
                                />
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

                        {/* {preview && (
                            <Button
                                variant="contained"
                                color="primary"
                                sx={{ mt: 2 }}
                                onClick={applyShift}
                            >
                                Apply Shift
                            </Button>
                        )} */}
                    </CardContent></Card>
                </Grid>

                {/* Schedule Preview (all loads) */}
                <Grid item xs={12} sx={{ mt: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                {preview ? 'Shift Preview Schedule' : 'Current Schedule'}
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Device</TableCell>
                                        <TableCell>Old Start</TableCell>
                                        <TableCell>Old End</TableCell>
                                        <TableCell>New Start</TableCell>
                                        <TableCell>New End</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {scheduleRows.map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell>{r.name}</TableCell>
                                            <TableCell>{r.oldStart}</TableCell>
                                            <TableCell>{r.oldEnd}</TableCell>
                                            <TableCell>{r.newStart}</TableCell>
                                            <TableCell>{r.newEnd}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Save Report Dialog */}
            <Dialog 
                open={reportModalOpen} 
                onClose={closeReportDialog} 
                maxWidth="sm" 
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
                    }
                }}
            >
                <DialogTitle sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    fontWeight: 600,
                    fontSize: '1.5rem'
                }}>
                    <SaveIcon sx={{ mr: 2, color: 'primary.main' }} />
                    Save Current Report
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        label="Report Name"
                        fullWidth
                        value={reportName}
                        onChange={e => setReportName(e.target.value)}
                        sx={{ 
                            mt: 2,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2
                            }
                        }}
                    />
                    <TextField
                        label="Description"
                        fullWidth
                        multiline
                        rows={3}
                        value={reportDesc}
                        onChange={e => setReportDesc(e.target.value)}
                        sx={{ 
                            mt: 2,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button 
                        onClick={closeReportDialog} 
                        disabled={saving}
                        sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={saveReport}
                        disabled={!reportName.trim() || !reportDesc.trim() || saving}
                        sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                            '&:hover': {
                                background: 'linear-gradient(45deg, #1565c0, #1976d2)',
                            }
                        }}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}>
                <Alert severity={snack.sev} variant="filled" sx={{ width: '100%', borderRadius: 2 }}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
