import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhCN } from 'date-fns/locale';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, Area, ReferenceDot } from 'recharts';
import apiClient from '../api/client';
import { format, addDays } from 'date-fns';
import { CustomTooltip } from './CustomTooltip';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { useChartFullscreen } from '../hooks/useChartFullscreen';
import { useTouPeriodBackground } from '../hooks/useTouPeriodBackground';


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
    return point ? { x: point.time, y: value, label: value.toFixed(2) } : null;
};

export const PriceCurveComparisonTab: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [loading, setLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [extremePoints, setExtremePoints] = useState<any[]>([]);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    // 使用时段背景色 Hook
    const { TouPeriodAreas } = useTouPeriodBackground(analysisResult?.chart_data);

    const { 
        isFullscreen, 
        FullscreenEnterButton, 
        FullscreenExitButton, 
        FullscreenTitle, 
        NavigationButtons 
    } = useChartFullscreen({
        chartRef: chartContainerRef,
        title: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
        onPrevious: () => handleShiftDate(-1),
        onNext: () => handleShiftDate(1),
    });

    const fetchChartData = (date: Date | null) => {
        if (!date) return;
        setLoading(true);
        // setAnalysisResult(null); // This caused the unmounting bug, avoid it.
        setExtremePoints([]);
        const dateStr = format(date, 'yyyy-MM-dd');
        apiClient.get(`/api/v1/price_comparison?date=${dateStr}`)
            .then(response => {
                const res = response.data;
                if (res && res.chart_data && res.stats) {
                    res.chart_data = processChartData(res.chart_data);
                    setAnalysisResult(res);
                    const points = [
                        findExtremePoint(res.chart_data, 'day_ahead_price', res.stats.day_ahead_max),
                        findExtremePoint(res.chart_data, 'day_ahead_price', res.stats.day_ahead_min),
                        findExtremePoint(res.chart_data, 'real_time_price', res.stats.real_time_max),
                        findExtremePoint(res.chart_data, 'real_time_price', res.stats.real_time_min),
                    ].filter(p => p !== null);
                    setExtremePoints(points);
                } else {
                    setAnalysisResult(null);
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                setAnalysisResult(null);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchChartData(new Date());
    }, []);

    const handleQuery = () => fetchChartData(selectedDate);

    const handleShiftDate = (days: number) => {
        if (!selectedDate) return;
        const newDate = addDays(selectedDate, days);
        setSelectedDate(newDate);
        fetchChartData(newDate);
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
            <Box>
                <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <IconButton onClick={() => handleShiftDate(-1)}><ArrowLeftIcon /></IconButton>
                    <DatePicker label="选择日期" value={selectedDate} onChange={(date) => setSelectedDate(date)} />
                    <IconButton onClick={() => handleShiftDate(1)}><ArrowRightIcon /></IconButton>
                    <Button sx={{ ml: 2 }} variant="contained" onClick={handleQuery} disabled={loading}>{loading ? <CircularProgress size={24} /> : '查询'}</Button>
                </Paper>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>日前 & 实时价格对比</Typography>
                    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                        <Box 
                            ref={chartContainerRef} 
                            sx={{
                                height: 400, 
                                position: 'relative', 
                                backgroundColor: isFullscreen ? 'background.paper' : 'transparent',
                                p: isFullscreen ? 2 : 0,
                                // In fullscreen, occupy the whole viewport
                                ...(isFullscreen && {
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    width: '100vw',
                                    height: '100vh',
                                    zIndex: 1400, // Higher than AppBar
                                })
                            }}
                        >
                            <FullscreenEnterButton />
                            <FullscreenExitButton />
                            <FullscreenTitle />
                            <NavigationButtons />

                            {loading && (
                                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.7)', zIndex: 12 }}>
                                    <CircularProgress />
                                </Box>
                            )}

                            {!loading && !analysisResult ? (
                                <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                     <Typography>无数据</Typography>
                                </Box>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={analysisResult?.chart_data}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" interval={23} tick={{ fontSize: 12 }} />
                                        <YAxis domain={['dataMin - 10', 'dataMax + 10']} label={{ value: '价格 (元/MWh)', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip unit="元/MWh" />} />
                                        <Legend />
                                        {TouPeriodAreas}
                                        <Area type="monotone" dataKey="positiveDiff" fill="#ffc658" strokeWidth={0} name="日前 > 实时" />
                                        <Area type="monotone" dataKey="negativeDiff" fill="#82ca9d" strokeWidth={0} name="实时 > 日前" />
                                        <Line type="monotone" dataKey="day_ahead_price" stroke="#8884d8" dot={false} name="日前价格" />
                                        <Line type="monotone" dataKey="real_time_price" stroke="#ff8042" dot={false} name="实时价格" />
                                        {extremePoints.map((p, i) => <ReferenceDot key={i} r={5} fill="red" stroke="white" {...p} isFront={true} />)}
                                        <Brush dataKey="time" height={30} stroke="#8884d8" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>

                    {analysisResult && (
                        <>
                            <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>总体统计</Typography>
                            <TableContainer component={Paper} variant="outlined">
                                {/* ... Table Content ... */}
                            </TableContainer>

                            <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>分时段统计</Typography>
                            <TableContainer component={Paper} variant="outlined">
                                {/* ... Table Content ... */}
                            </TableContainer>
                        </>
                    )}
                </Box>
            </Box>
        </LocalizationProvider>
    );
};