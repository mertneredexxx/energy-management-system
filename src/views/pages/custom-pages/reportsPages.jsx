/* eslint-disable prettier/prettier */
// src/pages/ReportsPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import {
    Grid, Card, CardContent, Typography, Button,
    Modal, Box, Checkbox, FormControlLabel,
    CircularProgress, List, ListItem, Divider
} from '@mui/material';
import { supabase } from '../../../api/supabaseClient';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
    ResponsiveContainer, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import CompareModal from './compareModal';

const modalStyle = {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)', width: 800,
    bgcolor: 'background.paper', boxShadow: 24,
    p: 4, maxHeight: '90vh', overflowY: 'auto'
};

export default function ReportsPage() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailReport, setDetailReport] = useState(null);
    const [compareReports, setCompareReports] = useState([]);
    const [compareOpen, setCompareOpen] = useState(false);
    const compareRef = useRef();

    // fetch reports
    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return setLoading(false);
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (!error) setReports(data);
            setLoading(false);
        })();
    }, []);

    // safe diff
    function diffReports(a, b) {
        if (!a || !b) return ['No comparison available.'];
        const diffs = [];
        if (a.season !== b.season)
            diffs.push(`• Season: **${a.season}** → **${b.season}**`);
        if (+a.threshold_kw !== +b.threshold_kw)
            diffs.push(`• Threshold: **${a.threshold_kw} kW** → **${b.threshold_kw} kW**`);
        if (a.costs?.before !== b.costs?.before)
            diffs.push(
                `• Cost before shift: ₺${a.costs.before.toFixed(2)} → ₺${b.costs.before.toFixed(2)}`
            );
        if (a.costs?.after !== b.costs?.after)
            diffs.push(
                `• Cost after shift: ₺${a.costs.after.toFixed(2)} → ₺${b.costs.after.toFixed(2)}`
            );
        // device schedule diffs
        const mapA = Object.fromEntries((a.loads || []).map(l => [l.name, l]));
        const mapB = Object.fromEntries((b.loads || []).map(l => [l.name, l]));
        for (let name of new Set([...Object.keys(mapA), ...Object.keys(mapB)])) {
            const la = mapA[name], lb = mapB[name];
            if (!la) {
                diffs.push(`• **${name}** was _added_ in Report 2`);
            } else if (!lb) {
                diffs.push(`• **${name}** was _removed_ in Report 2`);
            } else if (la.start_time !== lb.start_time || la.end_time !== lb.end_time) {
                diffs.push(
                    `• **${name}**: ${la.start_time}–${la.end_time} → ${lb.start_time}–${lb.end_time}`
                );
            }
        }
        return diffs.length ? diffs : ['No differences detected.'];
    }

    const handleDownloadCompare = async () => {
        if (!compareRef.current) return;
        const canvas = await html2canvas(compareRef.current, { scale: 2 });
        const img = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = (canvas.height * pdfW) / canvas.width;
        pdf.addImage(img, 'PNG', 0, 0, pdfW, pdfH);
        pdf.save('compare_report.pdf');
    };

    if (loading) return <CircularProgress />;

    return (
        <>
            <Grid container spacing={2} sx={{ p: 2 }}>
                {reports.map(rep => (
                    <Grid key={rep.id} item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6">{rep.name || '—'}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {rep.created_at ? new Date(rep.created_at).toLocaleString() : '—'}
                                </Typography>
                                <Typography>Season: {rep.season || '—'}</Typography>
                                <Typography>Threshold: {rep.threshold_kw ?? '—'} kW</Typography>
                                <Box sx={{ mt: 2 }}>
                                    {/* <Button size="small" onClick={() => setDetailReport(rep)}>
                                        View Details
                                    </Button> */}
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={compareReports.some(r => r.id === rep.id)}
                                                onChange={(_, checked) => {
                                                    setCompareReports(cs => {
                                                        if (checked && cs.length < 2) return [...cs, rep];
                                                        if (!checked) return cs.filter(r => r.id !== rep.id);
                                                        return cs;
                                                    });
                                                }}
                                                disabled={
                                                    !compareReports.some(r => r.id === rep.id)
                                                    && compareReports.length >= 2
                                                }
                                            />
                                        }
                                        label="Select"
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}

                {compareReports.length === 2 && (
                    <Grid item xs={12} sx={{ textAlign: 'right', mt: 2 }}>
                        <Button variant="contained" onClick={() => setCompareOpen(true)}>
                            Compare
                        </Button>
                    </Grid>
                )}
            </Grid>

            <CompareModal
                open={compareOpen}
                onClose={() => setCompareOpen(false)}
                reportA={compareReports[0]}
                reportB={compareReports[1]}
            />
            {/* Details Modal */}
            <Modal
                open={Boolean(detailReport)}
                onClose={() => setDetailReport(null)}
            >
                <Box sx={modalStyle}>
                    {detailReport && (
                        <>
                            <Typography variant="h5" gutterBottom>
                                {detailReport.name}
                            </Typography>
                            <Typography gutterBottom>
                                Season: <strong>{detailReport.season}</strong> Threshold: <strong>{detailReport.threshold_kw} kW</strong>
                            </Typography>
                            <Typography gutterBottom>
                                Cost before: ₺{detailReport.costs?.before?.toFixed(2) || '—'},
                                after: ₺{detailReport.costs?.after?.toFixed(2) || '—'}
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            {/* only render chart if data exists */}
                            {Array.isArray(detailReport.hour_series) && (
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={detailReport.hour_series}>
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
                            )}

                            <Box sx={{ mt: 2, textAlign: 'right' }}>
                                <Button onClick={() => setDetailReport(null)}>Close</Button>
                            </Box>
                        </>
                    )}
                </Box>
            </Modal>

        
        </>
    );
}
