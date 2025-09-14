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
  Button,
  Card,
  CardContent
} from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
export default function CompareModal({ open, onClose, reportA, reportB }) {
  const ref = useRef();

  const [informationText, setInformationText] = useState(
    'Note: The static values used in this project are as follows:\n' +
      '- For Winter Sun Hours: 5.0 hours/day\n' +
      '- For Summer Sun Hours: 6.5 hours/day\n' +
      '- For Winter Wind Capacity Factor: 30%\n' +
      '- For Summer Wind Capacity Factor: 25%\n' +
      '- Performance Ratio (PR): 75%\n\n' +
      'Meteorological averages (retrieved from NASA POWER API):\n' +
      '- Solar (One Month): 5.8 kWh/m²/day\n' +
      '- Wind (One Month): 7.2 m/s\n' +
      '- Solar (One Year): 4.8 kWh/m²/day\n' +
      '- Wind (One Year): 6.5 m/s\n\n' +
      'Tariff (₺/kWh) For Summer: Off-Peak 00–07 & 22–24=0.30 · Mid-Peak 07–17=1.00 · Peak 17–22=1.60\n\n' +
      'Tariff (₺/kWh) For Winter: Off-Peak 00–06 & 22–24=0.35 · Mid-Peak 06–17=0.90 · Peak 17–22=1.40\n\n' +
      'These values are approximations and may not reflect actual conditions. Please ensure that you validate these values against your specific use case or consult with an expert for accurate analysis.\n\n'
  );

  if (!reportA || !reportB) return null;

  const renderTable = (data, columns) => (
    <Table size="small" sx={{ mb: 2 }}>
      <TableHead>
        <TableRow>
          {columns?.map((c, idx) => (
            <TableCell key={idx}>
              <strong>{c.title}</strong>
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {data?.map((row, i) => (
          <TableRow key={i}>
            {columns?.map((c, j) => (
              <TableCell key={j}>{typeof c.field === 'function' ? c.field(row) : row[c.field]}</TableCell>
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
    const el = document.getElementById('compare-modal');
    if (!el) return;

    // Temporarily expand to full height
    const orig = {
      height: el.style.height,
      overflow: el.style.overflow,
      scroll: el.scrollTop
    };
    el.style.height = `${el.scrollHeight}px`;
    el.style.overflow = 'visible';
    el.scrollTop = 0;

    // Render full content
    const canvas = await html2canvas(el, { scale: 2, useCORS: true });

    // Restore original
    el.style.height = orig.height;
    el.style.overflow = orig.overflow;
    el.scrollTop = orig.scroll;

    // Convert to image data
    const imgData = canvas.toDataURL('image/png');

    // A4 width in mm
    const pdfW = 210;
    // Compute PDF height so image isn’t squashed
    const pdfH = (canvas.height * pdfW) / canvas.width;

    // Create one-page PDF of exact content size
    const pdf = new jsPDF('p', 'mm', [pdfW, pdfH]);
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);

    pdf.save(`compare_${reportA.name}_vs_${reportB.name}.pdf`);
  };

  const renderChart = (data, dataKey, title, threshold) => (
    <Box sx={{ height: 240, mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
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
    const lines = [];

    // Threshold comparison
    if (reportA.threshold_kw !== reportB.threshold_kw) {
      lines.push(
        <>
          The peak-capacity threshold for <strong>{reportA.name}</strong> was configured at {reportA.threshold_kw} kW, whereas{' '}
          <strong>{reportB.name}</strong> increased this limit to {reportB.threshold_kw} kW to allow more headroom during peak tariff
          windows.
        </>
      );
    } else {
      lines.push(
        <>
          Both <strong>{reportA.name}</strong> and <strong>{reportB.name}</strong> share the same peak-capacity threshold of{' '}
          {reportA.threshold_kw} kW, ensuring a consistent constraint on maximum grid draw during peak hours.
        </>
      );
    }

    // Season comparison
    if (reportA.season !== reportB.season) {
      lines.push(
        <>
          <strong>{reportA.name}</strong> was analyzed under “{reportA.season}” tariff schedules, while <strong>{reportB.name}</strong> uses
          the “{reportB.season}” schedule, altering off-peak and peak definitions and thus impacting the cost-optimization strategy.
        </>
      );
    } else {
      lines.push(
        <>
          Both <strong>{reportA.name}</strong> and <strong>{reportB.name}</strong> are evaluated under the same “{reportA.season}” tariff
          season, keeping the tariff windows identical across comparisons.
        </>
      );
    }

    // Daily totals & renewables
    lines.push(
      <>
        On <strong>{reportA.name}</strong>, the total aggregated daily demand reached <strong>{reportA.daily_total_load} kWh</strong>, while
        renewable generation supplied <strong>{reportA.total_renewable} kWh</strong>, demonstrating a net
        {reportA.total_renewable - reportA.daily_total_load >= 0 ? ' surplus.' : ' deficit.'}
      </>
    );

    lines.push(
      <>
        Similarly, <strong>{reportB.name}</strong> shows <strong>{reportB.daily_total_load} kWh</strong> of daily load with{' '}
        <strong>{reportB.total_renewable} kWh</strong> from renewables, indicating how seasonal or configuration changes affect the balance
        between demand and on-site generation.
      </>
    );

    // Loads & shifts
    const shiftedA = reportA.schedule_rows.filter((r) => r.oldStart !== r.newStart).length;
    lines.push(
      <>
        In <strong>{reportA.name}</strong>, {reportA.loads.length} discrete loads were considered. Of these, <strong>{shiftedA}</strong>{' '}
        device{shiftedA !== 1 ? 's' : ''} were algorithmically shifted into the 22:00 off-peak window to shave peaks.
      </>
    );
    const shiftedB = reportB.schedule_rows.filter((r) => r.oldStart !== r.newStart).length;
    lines.push(
      <>
        For <strong>{reportB.name}</strong>, {reportB.loads.length} loads were processed, with <strong>{shiftedB}</strong> shift operation
        {shiftedB !== 1 ? 's' : ''} performed, showcasing how the revised threshold/season parameters influence rescheduling.
      </>
    );

    // Costs & savings
    const saveA = (((reportA.costs.before - reportA.costs.after) / reportA.costs.before) * 100).toFixed(1);
    lines.push(
      <>
        Cost analysis for <strong>{reportA.name}</strong> reveals an original billing of ₺{reportA.costs.before.toFixed(2)}, reduced to ₺
        {reportA.costs.after.toFixed(2)} after optimization — a savings of {saveA}%.
      </>
    );
    const saveB = (((reportB.costs.before - reportB.costs.after) / reportB.costs.before) * 100).toFixed(1);
    lines.push(
      <>
        Under <strong>{reportB.name}</strong>, the cost dropped from ₺{reportB.costs.before.toFixed(2) + ' '}
        to ₺{reportB.costs.after.toFixed(2)}, achieving a savings of {saveB}%.
      </>
    );

    return (
      <>
        {lines.map((content, i) => (
          <Typography key={i} paragraph>
            {content}
          </Typography>
        ))}
      </>
    );
  };

  // 1) compute the names for easy diffing
  const namesA = reportA.loads.map((l) => l.name);
  const namesB = reportB.loads.map((l) => l.name);

  // 2) find which were removed (in A but not B) and which were added (in B but not A)
  const removedInB = namesA.filter((n) => !namesB.includes(n));
  const addedInB = namesB.filter((n) => !namesA.includes(n));

  // 1) Pull out the “model” names (or whatever unique key you use) for each report
  const modelsA = reportA.renewables.map((r) => r.model);
  const modelsB = reportB.renewables.map((r) => r.model);

  // 2) Compute which were removed (in A but not B) and which were added (in B but not A)
  const removedRenewables = modelsA.filter((m) => !modelsB.includes(m));
  const addedRenewables = modelsB.filter((m) => !modelsA.includes(m));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>Compare Reports</DialogTitle>
      <DialogContent dividers id="compare-modal">
        <Grid item xs={12} md={6}>
          <Alert
            severity="warning"
            icon={<WarningAmberIcon fontSize="inherit" />}
            sx={{ '& .MuiAlert-message': { whiteSpace: 'pre-wrap' } }} // preserves line breaks
          >
            {informationText}
          </Alert>
        </Grid>
        <Grid container spacing={4}>
          {/** --- Column A --- **/}
          <Grid item xs={12} md={6}>
            <Typography variant="h6">{reportA.name}</Typography>
            <Typography variant="subtitle2" gutterBottom>
              {reportA.description}
            </Typography>
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
                { title: 'When', field: (r) => (r.is_all_day ? '24h' : `${r.start_time.slice(0, 5)}-${r.end_time.slice(0, 5)}`) }
              ])}
              {addedInB.length > 0 && (
                <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                  Added in that Report: {addedInB.join(', ')}
                </Typography>
              )}
            </Grid>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Total Load : {reportA.daily_total_load} kWh
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">☀️ Renewables</Typography>
            <Grid style={{ minHeight: '400px' }}>
              {renderTable(reportA.renewables, [
                { title: 'Model', field: (r) => r.model },
                { title: 'Type', field: (r) => r.type },
                { title: 'Rated (kW)', field: 'rated' }
              ])}
              {addedRenewables.length > 0 && (
                <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                  Added in Report B: {addedRenewables.join(', ')}
                </Typography>
              )}
            </Grid>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Total Energy Production : {reportA.total_renewable} kWh
            </Typography>
            <Divider sx={{ my: 2 }} />
            {reportA.ev_session && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1">🔋 EV Session</Typography>
                {renderTable(
                  [reportA.ev_session],
                  [
                    { title: 'Rate (kW)', field: 'charging_rate' },
                    { title: 'Plug In', field: 'plug_in_time' },
                    { title: 'Plug Out', field: 'plug_out_time' },
                    { title: 'SoC Start (%)', field: 'initial_soc' },
                    { title: 'SoC End (%)', field: 'final_soc' }
                  ]
                )}
              </>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">📈 Hourly (Before & After Shift)</Typography>
          </Grid>

          {/** --- Column B --- **/}
          <Grid item xs={12} md={6}>
            <Typography variant="h6">{reportB.name}</Typography>
            <Typography variant="subtitle2" gutterBottom>
              {reportB.description}
            </Typography>
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
                { title: 'Power (kW)', field: (r) => (r.power_rate / 1000).toFixed(2) },
                { title: 'When', field: (r) => (r.is_all_day ? '24h' : `${r.start_time.slice(0, 5)}-${r.end_time.slice(0, 5)}`) }
              ])}
              {removedInB.length > 0 && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  Removed in that Report: {removedInB.join(', ')}
                </Typography>
              )}
            </Grid>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Total Load : {reportB.daily_total_load} kWh
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">☀️ Renewables</Typography>
            <Grid style={{ minHeight: '400px' }}>
              {renderTable(reportB.renewables, [
                { title: 'Model', field: (r) => r.model },
                { title: 'Type', field: (r) => r.type },
                { title: 'Rated (kW)', field: 'rated' }
              ])}
              {removedRenewables.length > 0 && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  Removed in Report B: {removedRenewables.join(', ')}
                </Typography>
              )}
            </Grid>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Total Energy Production : {reportB.total_renewable} kWh
            </Typography>
            <Divider sx={{ my: 2 }} />
            {reportB.ev_session && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1">🔋 EV Session</Typography>
                {renderTable(
                  [reportB.ev_session],
                  [
                    { title: 'Rate (kW)', field: 'charging_rate' },
                    { title: 'Plug In', field: 'plug_in_time' },
                    { title: 'Plug Out', field: 'plug_out_time' },
                    { title: 'SoC Start (%)', field: 'initial_soc' },
                    { title: 'SoC End (%)', field: 'final_soc' }
                  ]
                )}
              </>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">📈 Hourly (Before & After Shift)</Typography>
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          {/* Report A */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              {reportA.name} – Original vs Production
            </Typography>
            {renderChart(reportA.hour_series, 'Load', 'Original Demand', reportA.threshold_kw)}
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              {reportA.name} – Shifted vs Production
            </Typography>
            {renderChart(reportA.hour_series_shifted, 'ShiftedLoad', 'Shifted Demand', reportA.threshold_kw)}
            <Divider sx={{ my: 2 }} />
            <Grid style={{ minHeight: '400px' }}>
              <Grid item xs={12} sx={{ mt: 3 }}>
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
                          <TableCell>Run All Day</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportA?.schedule_rows.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.name}</TableCell>
                            <TableCell>{r.oldStart}</TableCell>
                            <TableCell>{r.oldEnd}</TableCell>
                            <TableCell>{r.newStart}</TableCell>
                            <TableCell>{r.newEnd}</TableCell>
                            <TableCell>
                              {r.isAllDay ? (
                                <span role="img" aria-label="tick">
                                  ✔️
                                </span>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Report B */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              {reportB.name} – Original vs Production
            </Typography>
            {renderChart(reportB.hour_series, 'Load', 'Original Demand', reportB.threshold_kw)}
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              {reportB.name} – Shifted vs Production
            </Typography>
            {renderChart(reportB.hour_series_shifted, 'ShiftedLoad', 'Shifted Demand', reportB.threshold_kw)}
            <Divider sx={{ my: 2 }} />
            <Grid style={{ minHeight: '400px' }}>
              <Grid item xs={12} sx={{ mt: 3 }}>
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
                          <TableCell>Run All Day</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportB?.schedule_rows.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.name}</TableCell>
                            <TableCell>{r.oldStart}</TableCell>
                            <TableCell>{r.oldEnd}</TableCell>
                            <TableCell>{r.newStart}</TableCell>
                            <TableCell>{r.newEnd}</TableCell>
                            <TableCell>
                              {r.isAllDay ? (
                                <span role="img" aria-label="tick">
                                  ✔️
                                </span>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Explanations */}
          <Grid item xs={12}>
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Detailed Explanation
              </Typography>
              {explain()}
            </Box>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />

        {/** --- Narrative of differences --- **/}
        <Box>
          <Typography variant="h6" gutterBottom>
            What Changed?
          </Typography>
          {diffLine('Threshold (kW)', reportA.home_settings.threshold_kw, reportB.home_settings.threshold_kw)}
          {diffLine('Season', reportA.home_settings.season, reportB.home_settings.season)}
          {diffLine('Number of Loads', reportA.loads.length, reportB.loads.length)}
          {diffLine('Number of Renewables', reportA.renewables.length, reportB.renewables.length)}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleDownload}>Download Comparison PDF</Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
