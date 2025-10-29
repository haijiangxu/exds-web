import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper, IconButton, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhCN } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, Area, ComposedChart, ReferenceDot } from 'recharts';
import apiClient from '../api/client';
import { format, addMonths, parse } from 'date-fns';
import { CustomTooltip } from './CustomTooltip';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';

const timeSlots = Array.from({ length: 96 }, (_, i) => {
    const hour = Math.floor(i / 4).toString().padStart(2, '0');
    const minute = ((i % 4) * 15).toString().padStart(2, '0');
    return `${hour}:${minute}`;
});

const TOU_PERIOD_COLORS: { [key: string]: string } = {
    '尖峰': 'rgba(255, 0, 0, 0.2)',
    '高峰': 'rgba(255, 165, 0, 0.2)',
    '平段': 'rgba(128, 128, 128, 0.1)',
    '低谷': 'rgba(0, 191, 255, 0.2)',
    '深谷': 'rgba(0, 0, 255, 0.2)',
};

const processChartData = (data: any[]) => {
    return data.map(item => {
        const { day_ahead_price, real_time_price } = item;
        let positiveDiff = null;
        let negativeDiff = null;
        if (day_ahead_price !== null && real_time_price !== null) {
            if (day_ahead_price > real_time_price) {
                positiveDiff = [real_time_price, day_ahead_price];
            } else {
                negativeDiff = [day_ahead_price, real_time_price];
            }
        }
        return { ...item, positiveDiff, negativeDiff };
    });
};

const findExtremePoint = (data: any[], key: string, value: number) => {
    if (value === null || !data || data.length === 0) return null;
    const point = data.find(d => d[key] === value);
    return point ? { x: point.day, y: value, label: value.toFixed(2) } : null;
};

export const TimeslotAnalysisTab: React.FC = () => {
    const [availableMonths, setAvailableMonths] = useState<string[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [selectedSlot, setSelectedSlot] = useState<string>('00:00');
    const [loading, setLoading] = useState(true);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [extremePoints, setExtremePoints] = useState<any[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const fetchChartData = (month: string, slot: string) => {
        if (!month || !slot) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setAnalysisResult(null);
        setExtremePoints([]);
        apiClient.get(`/api/timeslot_analysis?month=${month}&slot=${slot}`)
            .then(response => {
                const res = response.data;
                if (res && res.chart_data && res.stats) {
                    res.chart_data = processChartData(res.chart_data);
                    setAnalysisResult(res);
                    const points = [
                        findExtremePoint(res.chart_data, 'real_time_price', res.stats.real_time_max),
                        findExtremePoint(res.chart_data, 'real_time_price', res.stats.real_time_min),
                    ].filter(p => p !== null);
                    setExtremePoints(points);
                }
            })
            .catch(error => console.error('Error fetching data:', error))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        apiClient.get('/api/available_months').then(response => {
            const months = response.data;
            if (months && months.length > 0) {
                setAvailableMonths(months);
                setSelectedMonth(months[0]);
            } else {
                setLoading(false);
            }
        }).catch(error => {
            console.error('Error fetching available months:', error);
            setLoading(false);
        });
    }, []);

    // 当月份或时段变化时，自动触发查询
    useEffect(() => {
        if (selectedMonth && selectedSlot) {
            fetchChartData(selectedMonth, selectedSlot);
        }
    }, [selectedMonth, selectedSlot]);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const handleMonthChange = (event: SelectChangeEvent<string>) => setSelectedMonth(event.target.value);
    const handleSlotChange = (event: SelectChangeEvent<string>) => setSelectedSlot(event.target.value);

    const handleShiftMonth = (offset: number) => {
        if (availableMonths.length === 0) return;
        const currentIndex = availableMonths.indexOf(selectedMonth);
        let newIndex = currentIndex + offset;
        if (newIndex >= 0 && newIndex < availableMonths.length) {
            setSelectedMonth(availableMonths[newIndex]);
        }
    };

    const handleShiftSlot = (offset: number) => {
        const currentIndex = timeSlots.indexOf(selectedSlot);
        const newIndex = (currentIndex + offset + timeSlots.length) % timeSlots.length;
        setSelectedSlot(timeSlots[newIndex]);
    };

    const handleFullscreenToggle = async () => {
        if (!chartContainerRef.current) return;
        if (!isFullscreen) {
            try {
                await chartContainerRef.current.requestFullscreen();
                if (window.screen.orientation && window.screen.orientation.lock) await window.screen.orientation.lock('landscape');
            } catch (err) { console.error(err); }
        } else {
            try {
                if (window.screen.orientation && window.screen.orientation.unlock) window.screen.orientation.unlock();
                await document.exitFullscreen();
            } catch (err) { console.error(err); }
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
            <Box>
                <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton onClick={() => handleShiftMonth(-1)} disabled={!selectedMonth || availableMonths.indexOf(selectedMonth) === 0}><ArrowLeftIcon /></IconButton>
                        <FormControl sx={{ minWidth: 150 }}>
                            <InputLabel>月份</InputLabel>
                            <Select value={selectedMonth} label="月份" onChange={handleMonthChange} disabled={availableMonths.length === 0}>
                                {availableMonths.length === 0 && loading && <MenuItem disabled>加载中...</MenuItem>}
                                {availableMonths.length === 0 && !loading && <MenuItem disabled>无可用数据</MenuItem>}
                                {availableMonths.map(month => <MenuItem key={month} value={month}>{month}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <IconButton onClick={() => handleShiftMonth(1)} disabled={!selectedMonth || availableMonths.indexOf(selectedMonth) === availableMonths.length - 1}><ArrowRightIcon /></IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton onClick={() => handleShiftSlot(-1)}><ArrowLeftIcon /></IconButton>
                        <FormControl sx={{ minWidth: 180 }}>
                            <InputLabel>时段</InputLabel>
                            <Select value={selectedSlot} label="时段" onChange={handleSlotChange}>
                                {timeSlots.map((slot, index) => {
                                    const nextSlotIndex = index + 1;
                                    const endTime = nextSlotIndex < timeSlots.length ? timeSlots[nextSlotIndex] : "24:00";
                                    return <MenuItem key={slot} value={slot}>{`${slot} - ${endTime}`}</MenuItem>;
                                })}
                            </Select>
                        </FormControl>
                        <IconButton onClick={() => handleShiftSlot(1)}><ArrowRightIcon /></IconButton>
                    </Box>
                    {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}
                </Paper>

                {analysisResult ? (
                    <Box>
                        <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>{`${selectedMonth} / ${selectedSlot} 时段价格分析`}</Typography>
                        <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                            <Box ref={chartContainerRef} sx={{ height: 400, position: 'relative', backgroundColor: isFullscreen ? 'background.paper' : 'transparent', p: isFullscreen ? 2 : 0 }}>
                                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: isFullscreen ? 'block' : { xs: 'block', sm: 'none' } }}>
                                    <IconButton onClick={handleFullscreenToggle} size="small" color="primary">{isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}</IconButton>
                                </Box>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={analysisResult.chart_data}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="day" allowDuplicatedCategory={false} label={{ value: '日期 (日)', position: 'insideBottom', offset: -5 }} tick={{ fontSize: 12 }} />
                                        <YAxis domain={['dataMin - 10', 'dataMax + 10']} label={{ value: '价格 (元/MWh)', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip unit="元/MWh" />} />
                                        <Legend />
                                        <Area type="monotone" dataKey="positiveDiff" fill="#ffc658" strokeWidth={0} name="日前 > 实时" />
                                        <Area type="monotone" dataKey="negativeDiff" fill="#82ca9d" strokeWidth={0} name="实时 > 日前" />
                                        <Line type="monotone" dataKey="day_ahead_price" stroke="#8884d8" dot={false} name="日前价格" />
                                        <Line type="monotone" dataKey="real_time_price" stroke="#ff8042" dot={false} name="实时价格" />
                                        {extremePoints.map((p, i) => <ReferenceDot key={i} r={5} fill="#ff8042" stroke="white" {...p} isFront={true} />)}
                                        <Brush dataKey="day" height={30} stroke="#8884d8" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>

                        <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>统计指标</Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>价格类型</TableCell>
                                        <TableCell align="right">平均值</TableCell>
                                        <TableCell align="right">波动率 (标准差)</TableCell>
                                        <TableCell align="right">最大值</TableCell>
                                        <TableCell align="right">最小值</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>日前价格</TableCell>
                                        <TableCell align="right">{analysisResult.stats.day_ahead_avg?.toFixed(2)}</TableCell>
                                        <TableCell align="right">{analysisResult.stats.day_ahead_std_dev?.toFixed(2)}</TableCell>
                                        <TableCell align="right">{analysisResult.stats.day_ahead_max?.toFixed(2)}</TableCell>
                                        <TableCell align="right">{analysisResult.stats.day_ahead_min?.toFixed(2)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>实时价格</TableCell>
                                        <TableCell align="right">{analysisResult.stats.real_time_avg?.toFixed(2)}</TableCell>
                                        <TableCell align="right">{analysisResult.stats.real_time_std_dev?.toFixed(2)}</TableCell>
                                        <TableCell align="right">{analysisResult.stats.real_time_max?.toFixed(2)}</TableCell>
                                        <TableCell align="right">{analysisResult.stats.real_time_min?.toFixed(2)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                ) : (
                    !loading && <Typography sx={{ mt: 4, textAlign: 'center' }}>无数据，请选择月份和时段后点击查询。</Typography>
                )}
            </Box>
        </LocalizationProvider>
    );
};