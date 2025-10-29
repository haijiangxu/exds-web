
import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhCN } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, Area, ComposedChart, ReferenceDot, ReferenceArea } from 'recharts';
import apiClient from '../api/client';
import { format, addDays } from 'date-fns';
import { CustomTooltip } from './CustomTooltip';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';

// 最终颜色方案
const TOU_PERIOD_COLORS: { [key: string]: string } = {
    '尖峰': 'rgba(255, 0, 0, 0.2)',      // 红色
    '高峰': 'rgba(255, 165, 0, 0.2)',    // 橙色
    '平段': 'rgba(128, 128, 128, 0.1)',  // 灰色
    '低谷': 'rgba(0, 191, 255, 0.2)',    // 天蓝色
    '深谷': 'rgba(0, 0, 255, 0.2)',      // 蓝色
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
    return point ? { x: point.time, y: value, label: value.toFixed(2) } : null;
};

const getTouAreas = (data: any[]) => {
    if (!data || data.length === 0) return [];
    const areas = [];
    if (data.length > 0) {
        let currentArea = { type: data[0].period_type, x1: data[0].time, x2: '' };
        for (let i = 1; i < data.length; i++) {
            if (data[i].period_type !== currentArea.type) {
                currentArea.x2 = data[i].time;
                areas.push(currentArea);
                currentArea = { type: data[i].period_type, x1: data[i].time, x2: '' };
            }
        }
        currentArea.x2 = '24:00';
        areas.push(currentArea);
    }
    return areas;
};

export const PriceCurveComparisonTab: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [loading, setLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [extremePoints, setExtremePoints] = useState<any[]>([]);
    const [touAreas, setTouAreas] = useState<any[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const fetchChartData = (date: Date | null) => {
        if (!date) return;
        setLoading(true);
        setAnalysisResult(null);
        setExtremePoints([]);
        setTouAreas([]);
        const dateStr = format(date, 'yyyy-MM-dd');
        apiClient.get(`/api/price_comparison?date=${dateStr}`)
            .then(response => {
                const res = response.data;
                if (res && res.chart_data && res.stats) {
                    res.chart_data = processChartData(res.chart_data);
                    setAnalysisResult(res);
                    setTouAreas(getTouAreas(res.chart_data));
                    const points = [
                        findExtremePoint(res.chart_data, 'day_ahead_price', res.stats.day_ahead_max),
                        findExtremePoint(res.chart_data, 'day_ahead_price', res.stats.day_ahead_min),
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
        fetchChartData(new Date());
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const handleQuery = () => fetchChartData(selectedDate);

    const handleShiftDate = (days: number) => {
        if (!selectedDate) return;
        const newDate = addDays(selectedDate, days);
        setSelectedDate(newDate);
        fetchChartData(newDate);
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
                <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <IconButton onClick={() => handleShiftDate(-1)}><ArrowLeftIcon /></IconButton>
                    <DatePicker label="选择日期" value={selectedDate} onChange={(date) => setSelectedDate(date)} />
                    <IconButton onClick={() => handleShiftDate(1)}><ArrowRightIcon /></IconButton>
                    <Button sx={{ ml: 2 }} variant="contained" onClick={handleQuery} disabled={loading}>{loading ? <CircularProgress size={24} /> : '查询'}</Button>
                </Paper>

                {analysisResult ? (
                    <Box>
                        <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>日前 & 实时价格对比</Typography>
                        <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                            <Box ref={chartContainerRef} sx={{ height: 400, position: 'relative', backgroundColor: isFullscreen ? 'background.paper' : 'transparent', p: isFullscreen ? 2 : 0 }}>
                                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: isFullscreen ? 'block' : { xs: 'block', sm: 'none' } }}>
                                    <IconButton onClick={handleFullscreenToggle} size="small" color="primary">{isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}</IconButton>
                                </Box>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={analysisResult.chart_data}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" interval={23} tick={{ fontSize: 12 }} />
                                        <YAxis domain={['dataMin - 10', 'dataMax + 10']} label={{ value: '价格 (元/MWh)', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip unit="元/MWh" />} />
                                        <Legend />
                                        {touAreas.map((area, index) => (
                                            <ReferenceArea key={index} x1={area.x1} x2={area.x2} strokeOpacity={0} fill={TOU_PERIOD_COLORS[area.type] || 'transparent'} />
                                        ))}
                                        <Area type="monotone" dataKey="positiveDiff" fill="#ffc658" strokeWidth={0} name="日前 > 实时" />
                                        <Area type="monotone" dataKey="negativeDiff" fill="#82ca9d" strokeWidth={0} name="实时 > 日前" />
                                        <Line type="monotone" dataKey="day_ahead_price" stroke="#8884d8" dot={false} name="日前价格" />
                                        <Line type="monotone" dataKey="real_time_price" stroke="#ff8042" dot={false} name="实时价格" />
                                        {extremePoints.map((p, i) => <ReferenceDot key={i} r={5} fill="red" stroke="white" {...p} isFront={true} />)}
                                        <Brush dataKey="time" height={30} stroke="#8884d8" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>

                        <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>总体统计</Typography>
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

                        <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>分时段统计</Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>时段类型</TableCell>
                                        <TableCell align="right">日前平均价</TableCell>
                                        <TableCell align="right">日前倍率</TableCell>
                                        <TableCell align="right">实时平均价</TableCell>
                                        <TableCell align="right">实时倍率</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {Object.entries(analysisResult.tou_stats).map(([period, stats]: [string, any]) => (
                                        <TableRow key={period}>
                                            <TableCell>{period}</TableCell>
                                            <TableCell align="right">{stats.day_ahead_avg?.toFixed(2) || 'N/A'}</TableCell>
                                            <TableCell align="right">{stats.day_ahead_ratio || '-'}</TableCell>
                                            <TableCell align="right">{stats.real_time_avg?.toFixed(2) || 'N/A'}</TableCell>
                                            <TableCell align="right">{stats.real_time_ratio || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                ) : (
                    !loading && <Typography sx={{ mt: 4, textAlign: 'center' }}>无数据，请选择日期后点击查询。</Typography>
                )}
            </Box>
        </LocalizationProvider>
    );
};
