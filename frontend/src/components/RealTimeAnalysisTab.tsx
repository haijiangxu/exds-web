import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper, IconButton, Grid
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhCN } from 'date-fns/locale';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ScatterChart, Scatter, ZAxis, Bar, ReferenceLine, Cell } from 'recharts';
import apiClient from '../api/client';
import { format, addDays } from 'date-fns';
import { CustomTooltip } from './CustomTooltip';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { useChartFullscreen } from '../hooks/useChartFullscreen';
import { useTouPeriodBackground } from '../hooks/useTouPeriodBackground';

// API数据预处理
const processApiData = (data: any[]) => {
    if (!data) return [];
    return data.map(item => ({
        ...item,
        // 合并抽蓄和电池储能为总储能
        storage_clearing_power: (item.pumped_storage_clearing_power || 0) + (item.battery_storage_clearing_power || 0),
    }));
};

export const RealTimeAnalysisTab: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(addDays(new Date(), -2));
    const [loading, setLoading] = useState(false);
    const [chartData, setChartData] = useState<any[]>([]);

    // 为每个图表创建独立的 ref
    const priceVolumeChartRef = useRef<HTMLDivElement>(null);
    const supplyStackChartRef = useRef<HTMLDivElement>(null);
    const supplyCurveChartRef = useRef<HTMLDivElement>(null);
    const volatilityChartRef = useRef<HTMLDivElement>(null);

    const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

    // 全屏Hooks
    const { isFullscreen: isFs1, FullscreenEnterButton: FSEnter1, FullscreenExitButton: FSExit1, FullscreenTitle: FSTitle1, NavigationButtons: FSNav1 } = useChartFullscreen({
        chartRef: priceVolumeChartRef, title: `${dateStr} 现货价格与负荷`, onPrevious: () => handleShiftDate(-1), onNext: () => handleShiftDate(1),
    });
    const { isFullscreen: isFs2, FullscreenEnterButton: FSEnter2, FullscreenExitButton: FSExit2, FullscreenTitle: FSTitle2, NavigationButtons: FSNav2 } = useChartFullscreen({
        chartRef: supplyStackChartRef, title: `${dateStr} 现货供给堆栈`, onPrevious: () => handleShiftDate(-1), onNext: () => handleShiftDate(1),
    });
    const { isFullscreen: isFs3, FullscreenEnterButton: FSEnter3, FullscreenExitButton: FSExit3, FullscreenTitle: FSTitle3, NavigationButtons: FSNav3 } = useChartFullscreen({
        chartRef: supplyCurveChartRef, title: `${dateStr} 现货供给曲线`, onPrevious: () => handleShiftDate(-1), onNext: () => handleShiftDate(1),
    });
    const { isFullscreen: isFs4, FullscreenEnterButton: FSEnter4, FullscreenExitButton: FSExit4, FullscreenTitle: FSTitle4, NavigationButtons: FSNav4 } = useChartFullscreen({
        chartRef: volatilityChartRef, title: `${dateStr} 现货价格波动`, onPrevious: () => handleShiftDate(-1), onNext: () => handleShiftDate(1),
    });

    const { TouPeriodAreas } = useTouPeriodBackground(chartData);

    const fetchData = (date: Date | null) => {
        if (!date) return;
        setLoading(true);
        const formattedDate = format(date, 'yyyy-MM-dd');
        apiClient.get(`/api/v1/market-analysis/real-time?date=${formattedDate}`)
            .then(response => {
                const processedData = processApiData(response.data);
                setChartData(processedData);
            })
            .catch(error => {
                console.error('Error fetching real-time analysis data:', error);
                setChartData([]);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData(selectedDate);
    }, []);

    const handleQuery = () => fetchData(selectedDate);

    const handleShiftDate = (days: number) => {
        if (!selectedDate) return;
        const newDate = addDays(selectedDate, days);
        setSelectedDate(newDate);
        fetchData(newDate);
    };

    const renderChartContainer = (ref: React.RefObject<HTMLDivElement | null>, isFullscreen: boolean, title: string, enter: React.ReactElement, exit: React.ReactElement, fsTitle: React.ReactElement, nav: React.ReactElement, chart: React.ReactElement) => (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>{title}</Typography>
            <Box
                ref={ref}
                sx={{
                    height: 400,
                    position: 'relative',
                    backgroundColor: isFullscreen ? 'background.paper' : 'transparent',
                    p: isFullscreen ? 2 : 0,
                    ...(isFullscreen && { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1400 })
                }}
            >
                {enter}{exit}{fsTitle}{nav}
                {loading ? (
                    <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
                ) : !chartData || chartData.length === 0 ? (
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

                {renderChartContainer(priceVolumeChartRef, isFs1, '现货价格与负荷', FSEnter1(), FSExit1(), FSTitle1(), FSNav1(),
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time_str" interval={11} tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" label={{ value: '价格 (元/MWh)', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: '电量 (MWh)', angle: -90, position: 'insideRight' }} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip unitMap={{ avg_clearing_price: '元/MWh', total_clearing_power: 'MWh' }} />} />
                        <Legend />
                        {TouPeriodAreas}
                        <Line yAxisId="left" type="monotone" dataKey="avg_clearing_price" stroke="#f44336" name="现货价格" dot={false} />
                        <Area yAxisId="right" type="monotone" dataKey="total_clearing_power" fill="#ff9800" stroke="#ff9800" name="现货总电量" />
                    </ComposedChart>
                )}

                {renderChartContainer(supplyStackChartRef, isFs2, '现货供给堆栈', FSEnter2(), FSExit2(), FSTitle2(), FSNav2(),
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time_str" interval={11} tick={{ fontSize: 12 }} />
                        <YAxis label={{ value: '电量 (MWh)', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip unit="MWh" />} />
                        <Legend />
                        <Area type="monotone" dataKey="thermal_clearing_power" stackId="1" stroke="#FF8042" fill="#FF8042" name="火电" />
                        <Area type="monotone" dataKey="hydro_clearing_power" stackId="1" stroke="#8884D8" fill="#8884D8" name="水电" />
                        <Area type="monotone" dataKey="wind_clearing_power" stackId="1" stroke="#82CA9D" fill="#82CA9D" name="风电" />
                        <Area type="monotone" dataKey="solar_clearing_power" stackId="1" stroke="#FFC658" fill="#FFC658" name="光伏" />
                        <Area type="monotone" dataKey="storage_clearing_power" stackId="1" stroke="#00C49F" fill="#00C49F" name="储能" />
                    </ComposedChart>
                )}

                {renderChartContainer(volatilityChartRef, isFs4, '现货价格波动', FSEnter4(), FSExit4(), FSTitle4(), FSNav4(),
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time_str" interval={11} tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} label={{ value: '价格波动 (元/MWh)', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip unit="元/MWh" />} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#000" />
                        <Bar dataKey="price_ramp" name="价格波动">
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.price_ramp > 0 ? '#f44336' : '#4caf50'} />
                            ))}
                        </Bar>
                    </ComposedChart>
                )}

                {renderChartContainer(supplyCurveChartRef, isFs3, '现货供给曲线', FSEnter3(), FSExit3(), FSTitle3(), FSNav3(),
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid />
                        <XAxis
                            type="number"
                            dataKey="total_clearing_power"
                            name="电量"
                            unit="MWh"
                            label={{ value: '电量 (MWh)', position: 'insideBottom', offset: -10 }}
                            domain={[
                                dataMin => Math.floor(dataMin * 0.95),
                                dataMax => Math.ceil(dataMax * 1.05),
                            ]}
                        />
                        <YAxis type="number" dataKey="avg_clearing_price" name="价格" unit="元/MWh" label={{ value: '价格 (元/MWh)', angle: -90, position: 'insideLeft' }} />
                        <ZAxis dataKey="time_str" name="时间" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip unitMap={{ total_clearing_power: 'MWh', avg_clearing_price: '元/MWh' }} />} />
                        <Scatter name="现货供给" data={chartData} fill="#f44336" />
                    </ScatterChart>
                )}
            </Box>
        </LocalizationProvider>
    );
};