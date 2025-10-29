
import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, CircularProgress, Typography, Chip, Paper, IconButton } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhCN } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../api/client';
import { format } from 'date-fns';
import { CustomTooltip } from './CustomTooltip'; // 导入自定义Tooltip
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

interface MonthlyEnergyTabProps {
    selectedMeter: string;
}

const MAX_MONTHS = 4;
const LINE_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

// 数据转换函数
const transformDataForChart = (apiData: any) => {
    if (!apiData || Object.keys(apiData).length === 0) return [];
    const mergedData: { [day: string]: any } = {};
    const months = Object.keys(apiData);
    for (let i = 1; i <= 31; i++) {
        mergedData[i] = { day: i };
    }
    months.forEach(month => {
        if (apiData[month] && Array.isArray(apiData[month])) {
            apiData[month].forEach((point: { day: number; energy: number }) => {
                if (mergedData[point.day]) {
                    mergedData[point.day][month] = point.energy;
                }
            });
        }
    });
    return Object.values(mergedData);
};

export const MonthlyEnergyTab: React.FC<MonthlyEnergyTabProps> = ({ selectedMeter }) => {
    const [selectedMonths, setSelectedMonths] = useState<Date[]>([]);
    const [loading, setLoading] = useState(false);
    const [chartData, setChartData] = useState<any[]>([]);
    const [activeKeys, setActiveKeys] = useState<string[]>([]);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const handleMonthChange = (newValue: Date | null) => {
        if (newValue && selectedMonths.length < MAX_MONTHS) {
            const monthStr = format(newValue, 'yyyy-MM');
            if (!selectedMonths.find(d => format(d, 'yyyy-MM') === monthStr)) {
                setSelectedMonths([...selectedMonths, newValue].sort((a, b) => a.getTime() - b.getTime()));
            }
        }
    };

    const handleDeleteMonth = (monthToDelete: Date) => {
        setSelectedMonths(selectedMonths.filter(d => d.getTime() !== monthToDelete.getTime()));
    };

    const handleQuery = () => {
        if (selectedMonths.length === 0) return;
        setLoading(true);
        const monthParams = selectedMonths.map(date => `month=${format(date, 'yyyy-MM')}`);
        const queryString = monthParams.join('&');
        apiClient.get(`/api/daily_energy?meter_id=${selectedMeter}&${queryString}`)
            .then(response => {
                setActiveKeys(Object.keys(response.data));
                const transformedData = transformDataForChart(response.data);
                setChartData(transformedData);
            })
            .catch(error => console.error('Error fetching daily energy data:', error))
            .finally(() => setLoading(false));
    };

    const handleFullscreenToggle = async () => {
        if (!chartContainerRef.current) return;

        if (!isFullscreen) {
            try {
                await chartContainerRef.current.requestFullscreen();
                if (window.screen.orientation && window.screen.orientation.lock) {
                    await window.screen.orientation.lock('landscape');
                }
            } catch (err) {
                console.error('进入全屏或锁定横屏失败:', err);
            }
        } else {
            try {
                if (window.screen.orientation && window.screen.orientation.unlock) {
                    window.screen.orientation.unlock();
                }
                await document.exitFullscreen();
            } catch (err) {
                console.error('退出全屏失败:', err);
            }
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
            <Box>
                <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <DatePicker
                        label={`选择月份 (最多${MAX_MONTHS}个)`}
                        views={['year', 'month']}
                        value={null}
                        onChange={handleMonthChange}
                        disabled={!selectedMeter}
                    />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flexGrow: 1 }}>
                        {selectedMonths.map(month => (
                            <Chip
                                key={month.toISOString()}
                                label={format(month, 'yyyy-MM')}
                                onDelete={() => handleDeleteMonth(month)}
                            />
                        ))}
                    </Box>
                    <Button variant="contained" onClick={handleQuery} disabled={loading || !selectedMeter || selectedMonths.length === 0}>
                        {loading ? <CircularProgress size={24} /> : '查询'}
                    </Button>
                </Paper>

                <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>日电量对比</Typography>
                <Box 
                    ref={chartContainerRef} 
                    sx={{ 
                        height: 400, 
                        position: 'relative',
                        backgroundColor: isFullscreen ? 'background.paper' : 'transparent',
                        p: isFullscreen ? 2 : 0
                    }}
                >
                    <Box sx={{
                        position: 'absolute', 
                        top: 8, 
                        right: 8, 
                        zIndex: 10,
                        display: isFullscreen ? 'block' : { xs: 'block', sm: 'none' }
                    }}>
                        <IconButton onClick={handleFullscreenToggle} size="small" color="primary">
                            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                        </IconButton>
                    </Box>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" label={{ value: '日期 (日)', position: 'insideBottom', offset: -5 }} tick={{ fontSize: 12 }} />
                            <YAxis label={{ value: '电量 (kWh)', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip unit="kWh" />} />
                            <Legend />
                            {activeKeys.map((key, index) => (
                                <Line key={key} type="monotone" dataKey={key} stroke={LINE_COLORS[index % LINE_COLORS.length]} dot={false} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            </Box>
        </LocalizationProvider>
    );
};
