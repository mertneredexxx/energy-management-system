/* eslint-disable prettier/prettier */
import React, { useRef, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Grid,
    Typography,
    Divider,
    Box,
    Alert,
    Table,
    TableHead,
    TableRow,
    TableBody,
    TableCell,
    DialogActions,
    Button
} from '@mui/material';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine
} from 'recharts';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export default function CompareModal({
    open,
    onClose,
    reportA,
    reportB
}) {
    const ref = useRef();

    const [informationText, setInformationText] = useState(
        "Note: The static values used in this project are as follows:\n" +
        "- For Winter Sun Hours: 5.0 hours/day\n" +
        "- For Summer Sun Hours: 6.5 hours/day\n" +
        "- For Winter Wind Capacity Factor: 30%\n" +
        "- For Summer Wind Capacity Factor: 25%\n" +
        "- Performance Ratio (PR): 75%\n\n" +
        "Tariff (₺/kWh) For Summer: Off-Peak 00–06 & 22–24=0.30 · Mid-Peak 06–17=1.00 · Peak 17–22=1.60\n\n" +
        "Tariff (₺/kWh) For Winter: Off-Peak 00–06 & 22–24=0.35 · Mid-Peak 06–17=0.90 · Peak 17–22=1.40\n\n" +
        "These values are approximations and may not reflect actual conditions. Please ensure that you validate these values against your specific use case or consult with an expert for accurate analysis.\n\n"
    );

    if (!reportA || !reportB) return null;

    const renderTable = (data, columns) => (
        <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
                <TableRow>
                    {columns?.map((c, idx) => (
                        <TableCell key={idx}><strong>{c.title}</strong></TableCell>
                    ))}
                </TableRow>
            </TableHead>
            <TableBody>
                {data?.map((row, i) => (
                    <TableRow key={i}>
                        {columns?.map((c, j) => (
                            <TableCell key={j}>
                                {typeof c.field === 'function'
                                    ? c.field(row)
                                    : row[c.field]}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    const diffLine = (label, a, b) => (
        <Typography variant="body1" sx={{ mb: 1 }}>
            • <strong>{label}:</strong> was <code>{a}</code> → now <code>{b}</code>.
        </Typography>
    );

    const handleDownload = async () => {
        const el = ref.current;
        const canvas = await html2canvas(el, { scale: 2 });
        const img = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const w = pdf.internal.pageSize.getWidth();
        const h = (canvas.height * w) / canvas.width;
        pdf.addImage(img, 'PNG', 0, 0, w, h);
        pdf.save(`compare_${reportA.name}_vs_${reportB.name}.pdf`);
    };


    const renderChart = (data, dataKey, title, threshold) => (
        <Box sx={{ height: 240, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>{title}</Typography>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis unit=" kW" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey={dataKey} stroke="#f44336" dot={false} name={dataKey} />
                    <Line type="monotone" dataKey="Production" stroke="#4caf50" dot={false} />
                    <Line type="monotone" dataKey="EV" stroke="#2196f3" dot={false} />
                    {/* horizontal threshold line */}
                    <ReferenceLine
                        y={threshold}
                        stroke="#333"
                        strokeDasharray="5 5"
                        label={{ position: 'right', value: `${threshold} kW`, fill: '#333' }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </Box>
    );

    const explain = () => {
        const diffSavingsA = ((reportA.costs.before - reportA.costs.after) / reportA.costs.before) * 100;
        const diffSavingsB = ((reportB.costs.before - reportB.costs.after) / reportB.costs.before) * 100;
        return (
            <>
                <Typography paragraph>
                    <strong>{reportA.name}</strong> ({reportA.season}) originally cost ₺{reportA.costs.before.toFixed(2)} and after shifting ₺{reportA.costs.after.toFixed(2)}, a reduction of {diffSavingsA.toFixed(1)}%.
                    This was achieved under a threshold of {reportA.threshold_kw} kW peak capacity.
                </Typography>
                <Typography paragraph>
                    <strong>{reportB.name}</strong> ({reportB.season}) originally cost ₺{reportB.costs.before.toFixed(2)} and after shifting ₺{reportB.costs.after.toFixed(2)}, a reduction of {diffSavingsB.toFixed(1)}%.
                    Notice how the difference in season (“{reportB.season}”) and threshold ({reportB.threshold_kw} kW) changes the optimal shifting outcome.
                </Typography>
                <Typography paragraph>
                    In the charts above, the red line is your original demand, the orange/red-outlined (ShiftedLoad) is your post-shifting demand, and the green is renewable production.  You can see that loads during your peak tariff windows have been moved into off-peak hours to reduce cost, while respecting each device’s duration and the fixed refrigerator base load.
                </Typography>
            </>
        );
    };

    // 1) compute the names for easy diffing
    const namesA = reportA.loads.map(l => l.name);
    const namesB = reportB.loads.map(l => l.name);

    // 2) find which were removed (in A but not B) and which were added (in B but not A)
    const removedInB = namesA.filter(n => !namesB.includes(n));
    const addedInB = namesB.filter(n => !namesA.includes(n));

    // 1) Pull out the “model” names (or whatever unique key you use) for each report
    const modelsA = reportA.renewables.map(r => r.model);
    const modelsB = reportB.renewables.map(r => r.model);

    // 2) Compute which were removed (in A but not B) and which were added (in B but not A)
    const removedRenewables = modelsA.filter(m => !modelsB.includes(m));
    const addedRenewables = modelsB.filter(m => !modelsA.includes(m));

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
            <DialogTitle>Compare Reports</DialogTitle>
            <DialogContent dividers ref={ref}>
                <Grid container spacing={4}>

                    {/** --- Column A --- **/}
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6">{reportA.name}</Typography>
                        <Typography variant="subtitle2" gutterBottom>{reportA.description}</Typography>
                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle1">🏠 Home Settings</Typography>
                        <Typography variant="body2">
                            Season: {reportA.home_settings.season}, Threshold: {reportA.home_settings.threshold_kw} kW
                        </Typography>

                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1">🔌 Loads</Typography>
                        <Grid style={{ minHeight: '400px' }}>
                            {renderTable(reportA.loads, [
                                { title: 'Device', field: 'name' },
                                { title: 'Power (kW)', field: 'power_rate' },
                                { title: 'When', field: r => r.is_all_day ? '24h' : `${r.start_time.slice(0, 5)}-${r.end_time.slice(0, 5)}` }
                            ])}
                            {addedInB.length > 0 && (
                                <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                                    Added in that Report: {addedInB.join(', ')}
                                </Typography>
                            )}
                        </Grid>
                        <Typography variant="subtitle1">☀️ Renewables</Typography>
                        <Grid style={{ minHeight: '400px' }}>
                            {renderTable(reportA.renewables, [
                                { title: 'Model', field: r => r.model },
                                { title: 'Type', field: r => r.type },
                                { title: 'Rated (kW)', field: 'rated' }
                            ])}
                            {addedRenewables.length > 0 && (
                                <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                                    Added in Report B: {addedRenewables.join(', ')}
                                </Typography>
                            )}
                        </Grid>
                        {reportA.ev_session && <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle1">🔋 EV Session</Typography>
                            {renderTable([reportA.ev_session], [
                                { title: 'Rate (kW)', field: 'charging_rate' },
                                { title: 'Plug In', field: 'plug_in_time' },
                                { title: 'Plug Out', field: 'plug_out_time' },
                                { title: 'SoC Start (%)', field: 'initial_soc' },
                                { title: 'SoC End (%)', field: 'final_soc' },
                            ])}
                        </>}

                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1">📈 Hourly (Before & After Shift)</Typography>
                    </Grid>

                    {/** --- Column B --- **/}
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6">{reportB.name}</Typography>
                        <Typography variant="subtitle2" gutterBottom>{reportB.description}</Typography>
                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle1">🏠 Home Settings</Typography>
                        <Typography variant="body2">
                            Season: {reportB.home_settings.season}, Threshold: {reportB.home_settings.threshold_kw} kW
                        </Typography>

                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1">🔌 Loads</Typography>
                        <Grid style={{ minHeight: '400px' }}>
                            {renderTable(reportB.loads, [
                                { title: 'Device', field: 'name' },
                                { title: 'Power (kW)', field: r => (r.power_rate / 1000).toFixed(2) },
                                { title: 'When', field: r => r.is_all_day ? '24h' : `${r.start_time.slice(0, 5)}-${r.end_time.slice(0, 5)}` }
                            ])}
                            {removedInB.length > 0 && (
                                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                    Removed in that Report: {removedInB.join(', ')}
                                </Typography>
                            )}
                        </Grid>
                        <Typography variant="subtitle1">☀️ Renewables</Typography>
                        <Grid style={{ minHeight: '400px' }}>
                            {renderTable(reportB.renewables, [
                                { title: 'Model', field: r => r.model },
                                { title: 'Type', field: r => r.type },
                                { title: 'Rated (kW)', field: 'rated' }
                            ])}
                            {removedRenewables.length > 0 && (
                                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                    Removed in Report B: {removedRenewables.join(', ')}
                                </Typography>
                            )}
                        </Grid>

                        {reportB.ev_session && <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle1">🔋 EV Session</Typography>
                            {renderTable([reportB.ev_session], [
                                { title: 'Rate (kW)', field: 'charging_rate' },
                                { title: 'Plug In', field: 'plug_in_time' },
                                { title: 'Plug Out', field: 'plug_out_time' },
                                { title: 'SoC Start (%)', field: 'initial_soc' },
                                { title: 'SoC End (%)', field: 'final_soc' },
                            ])}
                        </>}

                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1">📈 Hourly (Before & After Shift)</Typography>
                    </Grid>
                </Grid>
                <Grid container spacing={2}>
                    {/* Report A */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>{reportA.name} – Original vs Production</Typography>
                        {renderChart(reportA.hour_series, 'Load', 'Original Demand', reportA.threshold_kw)}
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>{reportA.name} – Shifted vs Production</Typography>
                        {renderChart(reportA.hour_series_shifted, 'ShiftedLoad', 'Shifted Demand', reportA.threshold_kw)}
                    </Grid>

                    {/* Report B */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>{reportB.name} – Original vs Production</Typography>
                        {renderChart(reportB.hour_series, 'Load', 'Original Demand', reportB.threshold_kw)}
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>{reportB.name} – Shifted vs Production</Typography>
                        {renderChart(reportB.hour_series_shifted, 'ShiftedLoad', 'Shifted Demand', reportB.threshold_kw)}
                    </Grid>

                    {/* Explanations */}
                    <Grid item xs={12}>
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="h6" gutterBottom>Detailed Explanation</Typography>
                            {explain()}
                        </Box>
                    </Grid>
                </Grid>
                <Divider sx={{ my: 3 }} />

                {/** --- Narrative of differences --- **/}
                <Box>
                    <Typography variant="h6" gutterBottom>What Changed?</Typography>
                    {diffLine('Threshold (kW)', reportA.home_settings.threshold, reportB.home_settings.threshold)}
                    {diffLine('Season', reportA.home_settings.season, reportB.home_settings.season)}
                    {diffLine('Number of Loads', reportA.loads.length, reportB.loads.length)}
                    {diffLine('Number of Renewables', reportA.renewables.length, reportB.renewables.length)}
                    {diffLine('Cost Before Shift (₺)', reportA.costs.before.toFixed(2), reportB.costs.before.toFixed(2))}
                    {diffLine('Cost After Shift (₺)', reportA.costs.after.toFixed(2), reportB.costs.after.toFixed(2))}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleDownload}>Download Comparison PDF</Button>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
