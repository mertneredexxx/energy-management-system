/* eslint-disable prettier/prettier */
import React, { useEffect, useState } from 'react';
import {
    Container,
    TextField,
    Button,
    Typography,
    Card,
    CardContent,
    Grid,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    CircularProgress,
    Paper,
    Alert,
    TableContainer
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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export default function ExportPage() {
    const [loadRows, setLoadRows] = useState([]);
    const [totals, setTotals] = useState({ load: 0, prod: 0, net: 0 });
    const [costs, setCosts] = useState({ before: 0, after: 0 });
    const [loading, setLoading] = useState(true);
    const [loads, setLoads] = useState([]);
    const [renewables, setRenewables] = useState([]);
    const [meteorological, setMeteo] = useState([]);
    const [evSessions, setEvSessions] = useState([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [dailyLoads, setDailyLoads] = useState([]);
    const [dailyProds, setDailyProds] = useState([]);
    const [hourSeries, setHourSeries] = useState([]);
    const [hourSeriesAfterShifted, setHourSeriesAfterShifted] = useState([]);
    const [preview, setPreview] = useState(null); // null or { series: [...], updates: [...] }
    const [informationText, setInformationText] = useState(
        "Note: The static values used in this project are as follows:\n" +
        "- Sun Hours: 5.0 hours/day\n" +
        "- Wind Capacity Factor: 30%\n" +
        "- Performance Ratio (PR): 75%\n\n" +
        "Tariff (₺/kWh): Off-Peak 00–06 & 22–24=0.35 · Mid-Peak 06–17=0.90 · Peak 17–22=1.40\n\n" +
        "These values are approximations and may not reflect actual conditions. Please ensure that you validate these values against your specific use case or consult with an expert for accurate analysis.\n\n"
    );

    /* ---------- constants (edit if you wish) ---------- */
    const SUN_HOURS = 5.0;
    const WIND_CF = 0.30;
    const PR = 0.75;
    const GRID_LIMIT = 3;       // 3 kW apartment flat


    const priceHr = Array.from({ length: 24 }, (_, h) =>
        (h < 6 || h >= 22) ? 0.35 :   // off-peak
            (h < 17) ? 0.90 :   // mid-peak
                1.40     // peak
    );


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

    useEffect(() => {
        (async () => {

            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // fetch all the tables
            const [lRes, rRes, mRes, evRes] = await Promise.all([
                supabase.from('loads').select('*').eq('user_id', user.id),
                supabase.from('renewable_selections').select(`*, catalog:renewable_catalog(model_name, renewable_type, hourly_shape)`).eq('user_id', user.id),
                supabase.from('meteorological_data').select('*').eq('user_id', user.id),
                supabase.from('ev_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
            ]);
            if (lRes.data) setLoads(lRes.data);
            if (rRes.data) setRenewables(rRes.data);
            if (mRes.data) setMeteo(mRes.data);
            const ev = evRes.data?.[0] || null;
            if (ev) setEvSessions([ev]);

            // build hourly arrays
            const loadHr = Array(24).fill(0);
            const prodHr = Array(24).fill(0);

            // 1) daily loads table & fill loadHr
            let loadTotal = 0;
            const dl = lRes.data.map(l => {
                const p = l.power_rate / 1000;  // kW
                let s = parseInt(l.start_time.slice(0, 2));
                let e = parseInt(l.end_time.slice(0, 2)) || 24;
                if (e <= s) e += 24;
                const hrs = l.is_all_day ? 24 : (e - s);
                const kwh = p * hrs;
                loadTotal += kwh;
                // fill hourly
                for (let h = 0; h < hrs; h++) {
                    loadHr[(s + h) % 24] += p;
                }
                return { name: l.device_name, power: p, hrs, kwh: kwh.toFixed(2) };
            });
            setDailyLoads([...dl, { name: 'Total', power: '', hrs: '', kwh: loadTotal.toFixed(2) }]);

            // 2) daily production & fill prodHr
            let prodTotal = 0;
            const dp = rRes.data.map(r => {
                const rated = r.rated_power;
                const type = r.catalog.renewable_type;
                const daily = type === 'PV'
                    ? rated * SUN_HOURS * PR
                    : rated * WIND_CF * 24;
                prodTotal += daily;
                // distribute by shape
                r.catalog.hourly_shape.forEach((frac, i) => prodHr[i] += frac * daily);
                return { model: r.catalog.model_name, type, rated, kwh: daily.toFixed(2) };
            });
            setDailyProds([...dp, { model: 'Total', type: '', rated: '', kwh: prodTotal.toFixed(2) }]);



            const loadHourly = Array(24).fill(0);
            const prodHourly = Array(24).fill(0);

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
                const dailyKwh = type === 'PV'
                    ? rated * SUN_HOURS * PR
                    : rated * WIND_CF * 24;
                prodKwhTotal += dailyKwh;
                r.catalog.hourly_shape.forEach((f, idx) => prodHourly[idx] += f * dailyKwh);
                return { model: r.catalog.model_name, type, rated, kwh: dailyKwh.toFixed(2) };
            });

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
            setTotals({
                load: loadKwhTotal.toFixed(2),
                prod: prodKwhTotal.toFixed(2),
                net: (prodKwhTotal - loadKwhTotal).toFixed(2)
            });
            setLoading(false);
        })();
    }, []);

    useEffect(() => {
        async function fetchData() {
            await runShifting();
        }
        fetchData();
    }, [dailyLoads, dailyProds, totals]);

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
            // setSnack({ open: true, msg: 'No peaks – nothing to shift.', sev: 'info' });
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
            let s = parseInt(start.slice(0, 2), 10);
            let e = parseInt(end.slice(0, 2), 10) || 24;
            return e <= s ? e + 24 - s : e - s;
        };

        // 4) Prepare mutable arrays
        const shiftedLoadHr = [...baseLoad];
        const updates = [];
        let movedCount = 0;

        // 5) Sort flexible loads by priority desc, then power desc
        const flexLoads = [...loadRows]
            .filter(l => l.priority > 1 && !l.is_all_day)
            .sort((a, b) => b.priority - a.priority || b.power - a.power);

        // 6) Greedy placement loop
        for (const l of flexLoads) {
            // Remove original
            addInterval(
                shiftedLoadHr,
                {
                    power_rate: l.power_rate,
                    start: parseInt(l.start_time.slice(0, 2), 10),
                    end: parseInt(l.end_time.slice(0, 2), 10) || 24
                },
                -1
            );

            const duration = findDuration(l.start_time, l.end_time);
            const p_kW = l.power;

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
                    id: l.id,
                    start: `${String(tryStart).padStart(2, '0')}:00`,
                    end: `${String((tryStart + duration) % 24).padStart(2, '0')}:00`
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
        setHourSeriesAfterShifted(previewSeries);
        setPreview({ series: previewSeries, updates });
        const costAfter = previewSeries.reduce(
            (sum, { ShiftedLoad, Production, hour }) =>
                sum + Math.max(ShiftedLoad - Production, 0) * priceHr[+hour.slice(0, 2)],
            0
        );
        setCosts(costs => ({ before: costs.before, after: +costAfter.toFixed(2) }));
    }

    const handleDownloadPDF = () => {
        const input = document.getElementById('export-page');
        html2canvas(input, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const imgW = pdfW;
            const imgH = (canvas.height * imgW) / canvas.width;
            let heightLeft = imgH;
            let position = 0;

            // Add first “page” worth of image
            pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
            heightLeft -= pdfH;

            // As long as we have more image to show, add pages
            while (heightLeft > 0) {
                position = heightLeft - imgH;      // negative offset
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
                heightLeft -= pdfH;
            }

            pdf.save('energy_report.pdf');
        });
    };

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


    if (loading) return <CircularProgress />;

    return (
        <>
            <Container id="export-page" sx={{ py: 4 }}>
                <Typography style={{ marginBottom: '20px' }} variant="h4" gutterBottom>Export & Preview</Typography>

                {/* title/desc */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="Report Title"
                            fullWidth value={title}
                            onChange={e => setTitle(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="Description"
                            fullWidth multiline rows={2}
                            value={description}
                            onChange={e => setDescription(e.target.value)} />
                    </Grid>
                </Grid>

                {/* title/desc */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="Company Name"
                            fullWidth value={companyName}
                            onChange={e => setCompanyName(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Alert
                            severity="warning"
                            icon={<WarningAmberIcon fontSize="inherit" />}
                            sx={{ '& .MuiAlert-message': { whiteSpace: 'pre-wrap' } }}  // preserves line breaks
                        >
                            {informationText}
                        </Alert>
                    </Grid>
                </Grid>

                <Card container spacing={2} sx={{ mb: 3 }}>
                    <CardContent>
                        {evSessions.length > 0 && (
                            <>
                                <Typography variant="h6">EV Charging Sessions</Typography>
                                <TableContainer component={Paper} sx={{ mt: 2, mb: 4 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell><strong>Charging Rate (kW)</strong></TableCell>
                                                <TableCell><strong>Plug-in Time</strong></TableCell>
                                                <TableCell><strong>Plug-out Time</strong></TableCell>
                                                <TableCell><strong>Initial SoC (%)</strong></TableCell>
                                                <TableCell><strong>Final SoC (%)</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {evSessions.map(ev => (
                                                <TableRow key={ev.id}>
                                                    <TableCell>{ev.charging_rate}</TableCell>
                                                    <TableCell>{ev.plug_in_time}</TableCell>
                                                    <TableCell>{ev.plug_out_time}</TableCell>
                                                    <TableCell>{ev.initial_soc}</TableCell>
                                                    <TableCell>{ev.final_soc}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* daily load */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6">Daily Load Profile</Typography>
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
                                {dailyLoads.map((r, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{r.name}</TableCell>
                                        <TableCell>{r.power}</TableCell>
                                        <TableCell>{r.hrs}</TableCell>
                                        <TableCell>{r.kwh}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* daily production */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6">Daily Renewable Production</Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Model</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Rated (kW)</TableCell>
                                    <TableCell>Energy (kWh)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {dailyProds.map((r, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{r.model}</TableCell>
                                        <TableCell>{r.type}</TableCell>
                                        <TableCell>{r.rated}</TableCell>
                                        <TableCell>{r.kwh}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* hourly chart */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6">Hourly Load vs Production</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={hourSeries}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="hour" />
                                <YAxis unit=" kW" />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="Load" stroke="#f44336" dot={false} />
                                <Line type="monotone" dataKey="EV" stroke="#2196f3" dot={false} />
                                <Line type="monotone" dataKey="Production" stroke="#4caf50" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Combined hourly graph + shift button */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Hourly Load vs Production</Typography>
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={hourSeriesAfterShifted}>
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
                        </CardContent>
                    </Card>
                </Grid>

                {/* Schedule Preview (all loads) */}
                <Grid style={{marginBottom : '20px'}} item xs={12} sx={{ mt: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                {'Shift Preview Schedule'}
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
                <Grid>
                    <Card sx={{ mb: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle1">Cost Before Shift: ₺{costs.before.toFixed(2)}</Typography>
                            <Typography variant="subtitle1">Cost After  Shift: ₺{costs.after.toFixed(2)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Container>
            <Container>
                {/* download */}
                <Button variant="contained" color="primary" onClick={handleDownloadPDF}
                >
                    Download PDF Report
                </Button>
            </Container>
        </>

    );
}
