import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper, IconButton, Grid, FormGroup, FormControlLabel, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhCN } from 'date-fns/locale';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, ReferenceLine, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import apiClient from '../api/client';
import { format, addDays } from 'date-fns';
import { CustomTooltip } from './CustomTooltip';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { useChartFullscreen } from '../hooks/useChartFullscreen';
import { useSelectableSeries } from '../hooks/useSelectableSeries';
import { useMemo } from 'react';

const seriesConfig = {
    total_volume_deviation: { name: '总量偏差', color: '#FF8042' },
    thermal_deviation: { name: '火电偏差', color: '#FFBB28' },
    wind_deviation: { name: '风电偏差', color: '#00C49F' },
    solar_deviation: { name: '光伏偏差', color: '#0088FE' },
    hydro_deviation: { name: '水电偏差', color: '#8884d8' },
    storage_deviation: { name: '储能偏差', color: '#82ca9d' },
};

// 格式化坐标轴刻度
const tickFormatter = (value: number) => {
    if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
};

export const SpreadAnalysisTab: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(addDays(new Date(), -2));
    const [loading, setLoading] = useState(false);
    const [analysisData, setAnalysisData] = useState<{ time_series: any[], systematic_bias: any[] }>({ time_series: [], systematic_bias: [] });

    const chart1Ref = useRef<HTMLDivElement>(null);
    const chart2Ref = useRef<HTMLDivElement>(null);
    const chart3Ref = useRef<HTMLDivElement>(null);

    const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

    const handleShiftDate = (days: number) => {
        if (!selectedDate) return;
        const newDate = addDays(selectedDate, days);
        setSelectedDate(newDate);
        fetchData(newDate);
    };

    const { isFullscreen: isFs1, FullscreenEnterButton: FSEnter1, FullscreenExitButton: FSExit1, FullscreenTitle: FSTitle1, NavigationButtons: FSNav1 } = useChartFullscreen({ chartRef: chart1Ref, title: `价格偏差主图 (${dateStr})`, onPrevious: () => handleShiftDate(-1), onNext: () => handleShiftDate(1) });
    const { isFullscreen: isFs2, FullscreenEnterButton: FSEnter2, FullscreenExitButton: FSExit2, FullscreenTitle: FSTitle2, NavigationButtons: FSNav2 } = useChartFullscreen({ chartRef: chart2Ref, title: `偏差相关性 (${dateStr})`, onPrevious: () => handleShiftDate(-1), onNext: () => handleShiftDate(1) });
    const { isFullscreen: isFs3, FullscreenEnterButton: FSEnter3, FullscreenExitButton: FSExit3, FullscreenTitle: FSTitle3, NavigationButtons: FSNav3 } = useChartFullscreen({ chartRef: chart3Ref, title: `核心偏差归因 (${dateStr})`, onPrevious: () => handleShiftDate(-1), onNext: () => handleShiftDate(1) });

    const { seriesVisibility, handleLegendClick } = useSelectableSeries<keyof typeof seriesConfig>({
        total_volume_deviation: true, // 默认显示总量偏差
        thermal_deviation: false,
        wind_deviation: false,
        solar_deviation: false,
        hydro_deviation: false,
        storage_deviation: false,
    });

    // 为散点图动态计算X轴范围
    const xDomain = useMemo(() => {
        if (!analysisData.time_series || analysisData.time_series.length === 0) {
            return [0, 0];
        }
        const values = analysisData.time_series.map(d => d.total_volume_deviation as number);
        const dataMin = Math.min(...values);
        const dataMax = Math.max(...values);
        const padding = (dataMax - dataMin) * 0.05; // 5% 留白
        return [Math.floor(dataMin - padding), Math.ceil(dataMax + padding)];
    }, [analysisData.time_series]);

    const fetchData = (date: Date | null) => {
        if (!date) return;
        setLoading(true);
        const formattedDate = format(date, 'yyyy-MM-dd');
        apiClient.get(`/api/v1/market-analysis/spread-attribution?date=${formattedDate}`)
            .then(response => setAnalysisData(response.data))
            .catch(error => {
                console.error('Error fetching spread analysis data:', error);
                setAnalysisData({ time_series: [], systematic_bias: [] });
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { 
        fetchData(selectedDate); 
    }, []);

    const handleQuery = () => fetchData(selectedDate);

    const renderTableCell = (value: number | null) => {
        if (value === null || value === undefined) return <TableCell align="right">N/A</TableCell>;
        const color = value > 0 ? 'error.main' : value < 0 ? 'success.main' : 'text.primary';
        return <TableCell align="right" sx={{ color, fontWeight: 'bold' }}>{value.toFixed(2)}</TableCell>;
    };

    const renderChartContainer = (ref: React.RefObject<HTMLDivElement | null>, isFullscreen: boolean, title: string, enter: React.ReactElement, exit: React.ReactElement, fsTitle: React.ReactElement, nav: React.ReactElement, chart: React.ReactElement, height: number = 400) => (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>{title}</Typography>
            <Box
                ref={ref}
                sx={{
                    height: height,
                    position: 'relative',
                    backgroundColor: isFullscreen ? 'background.paper' : 'transparent',
                    p: isFullscreen ? 2 : 0,
                    ...(isFullscreen && { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1400 })
                }}
            >
                {enter}{exit}{fsTitle}{nav}
                {loading ? (
                    <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
                ) : !analysisData.time_series || analysisData.time_series.length === 0 ? (
                    <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Typography>无数据</Typography></Box>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>
                )}
            </Box>
        </Paper>
    );

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
            <Box>
                <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <IconButton onClick={() => handleShiftDate(-1)}><ArrowLeftIcon /></IconButton>
                    <DatePicker label="选择日期" value={selectedDate} onChange={(date) => setSelectedDate(date)} />
                    <IconButton onClick={() => handleShiftDate(1)}><ArrowRightIcon /></IconButton>
                    <Button sx={{ ml: 2 }} variant="contained" onClick={handleQuery} disabled={loading}>{loading ? <CircularProgress size={24} /> : '查询'}</Button>
                </Paper>

                <Grid container spacing={2} sx={{ mt: 0 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        {renderChartContainer(chart1Ref, isFs1, '价格偏差主图', FSEnter1(), FSExit1(), FSTitle1(), FSNav1(),
                            <ComposedChart data={analysisData.time_series}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time_str" interval={isFs1 ? 11 : 23} tick={{ fontSize: 10 }} />
                                <YAxis label={{ value: '价差(元/MWh)', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip unit="元/MWh" />} />
                                <ReferenceLine y={0} stroke="#000" />
                                <Bar dataKey="price_spread" name="价格偏差">
                                    {analysisData.time_series.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.price_spread > 0 ? '#f44336' : '#4caf50'} />
                                    ))}
                                </Bar>
                            </ComposedChart>,
                            300
                        )}
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        {renderChartContainer(chart2Ref, isFs2, '偏差相关性', FSEnter2(), FSExit2(), FSTitle2(), FSNav2(),
                            <ScatterChart>
                                <CartesianGrid />
                                <XAxis type="number" dataKey="total_volume_deviation" name="总量偏差" unit="MWh" tick={{ fontSize: 10 }} domain={xDomain} tickFormatter={tickFormatter} />
                                <YAxis type="number" dataKey="price_spread" name="价格偏差" unit="元/MWh" tick={{ fontSize: 10 }} />
                                <ZAxis dataKey="time_str" name="时间" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                                <Scatter name="偏差关系" data={analysisData.time_series} fill="#8884d8" />
                            </ScatterChart>,
                            300
                        )}
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        {renderChartContainer(chart3Ref, isFs3, '核心偏差归因', FSEnter3(), FSExit3(), FSTitle3(), FSNav3(),
                            <ComposedChart data={analysisData.time_series}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time_str" interval={isFs3 ? 5 : 11} tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="left" label={{ value: '价差(元/MWh)', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="right" orientation="right" label={{ value: '偏差(MWh)', angle: -90, position: 'insideRight' }} tick={{ fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip unitMap={{ price_spread: '元/MWh' }} unit="MWh" />} />
                                <Legend onClick={handleLegendClick} />
                                <ReferenceLine y={0} stroke="#000" yAxisId="right" />
                                <Bar yAxisId="left" dataKey="price_spread" name="价格偏差" barSize={20}>
                                    {analysisData.time_series.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.price_spread > 0 ? 'rgba(244, 67, 54, 0.5)' : 'rgba(76, 175, 80, 0.5)'} />
                                    ))}
                                </Bar>
                                {Object.entries(seriesConfig).map(([key, config]) => (
                                    seriesVisibility[key as keyof typeof seriesConfig] &&
                                    <Line key={key} yAxisId="right" type="monotone" dataKey={key} name={config.name} stroke={config.color} dot={false} />
                                ))}
                            </ComposedChart>
                        )}
                    </Grid>
                </Grid>

                <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                    <Typography variant="h6" gutterBottom>系统性偏差分析</Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>时段</TableCell>
                                    <TableCell align="right">平均价差</TableCell>
                                    <TableCell align="right">平均总量偏差</TableCell>
                                    <TableCell align="right">平均火电偏差</TableCell>
                                    <TableCell align="right">平均风电偏差</TableCell>
                                    <TableCell align="right">平均光伏偏差</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {analysisData.systematic_bias.map((row) => (
                                    <TableRow key={row.period_name}>
                                        <TableCell component="th" scope="row">{row.period_name}</TableCell>
                                        {renderTableCell(row.avg_price_spread)}
                                        {renderTableCell(row.avg_total_volume_deviation)}
                                        {renderTableCell(row.avg_thermal_deviation)}
                                        {renderTableCell(row.avg_wind_deviation)}
                                        {renderTableCell(row.avg_solar_deviation)}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>
        </LocalizationProvider>
    );
};