
import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, CircularProgress, Typography, Chip, Paper, IconButton } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhCN } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import apiClient from '../api/client';
import { format } from 'date-fns';
import { CustomTooltip } from './CustomTooltip'; // 导入自定义Tooltip
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

interface LoadCurveTabProps {
    selectedMeter: string;
}

const MAX_DATES = 7;
const LINE_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28'];

// 数据转换函数
const transformDataForChart = (apiData: any) => {
    if (!apiData || Object.keys(apiData).length === 0) return [];
    const mergedData: { [time: string]: any } = {};
    const dates = Object.keys(apiData);
    dates.forEach(date => {
        if (apiData[date] && Array.isArray(apiData[date])) {
            apiData[date].forEach((point: { time: string; value: number }) => {
                if (!mergedData[point.time]) {
                    mergedData[point.time] = { time: point.time };
                }
                mergedData[point.time][date] = point.value;
            });
        }
    });
    return Object.values(mergedData).sort((a, b) => a.time.localeCompare(b.time));
};

export const LoadCurveTab: React.FC<LoadCurveTabProps> = ({ selectedMeter }) => {
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [chartData, setChartData] = useState<any[]>([]);
    const [activeKeys, setActiveKeys] = useState<string[]>([]);
    
    const [isFullscreen, setIsFullscreen] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedMeter) {
            setSelectedDates([]);
            setChartData([]);
            setActiveKeys([]);
            apiClient.get(`/api/available-dates?meter_id=${selectedMeter}`)
                .then(response => setAvailableDates(response.data))
                .catch(error => console.error('Error fetching available dates:', error));
        }
    }, [selectedMeter]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const handleDateChange = (newValue: Date | null) => {
        if (newValue && selectedDates.length < MAX_DATES) {
            if (!selectedDates.find(d => d.getTime() === newValue.getTime())) {
                setSelectedDates([...selectedDates, newValue].sort((a, b) => a.getTime() - b.getTime()));
            }
        }
    };

    const handleDeleteDate = (dateToDelete: Date) => {
        setSelectedDates(selectedDates.filter(d => d.getTime() !== dateToDelete.getTime()));
    };

    const handleQuery = () => {
        if (selectedDates.length === 0) return;
        setLoading(true);
        const dateParams = selectedDates.map(date => `date=${format(date, 'yyyy-MM-dd')}`);
        const queryString = dateParams.join('&');
        apiClient.get(`/api/load_curve?meter_id=${selectedMeter}&${queryString}`)
            .then(response => {
                setActiveKeys(Object.keys(response.data));
                const transformedData = transformDataForChart(response.data);
                setChartData(transformedData);
            })
            .catch(error => console.error('Error fetching load curve data:', error))
            .finally(() => setLoading(false));
    };

    const shouldDisableDate = (date: Date) => !availableDates.includes(format(date, 'yyyy-MM-dd'));

    const handleFullscreenToggle = async () => {
        if (!chartContainerRef.current) return;

        if (!isFullscreen) {
            try {
                await chartContainerRef.current.requestFullscreen();
                // 成功进入全屏后，尝试锁定为横屏
                if (window.screen.orientation && window.screen.orientation.lock) {
                    await window.screen.orientation.lock('landscape');
                }
            } catch (err) {
                console.error('进入全屏或锁定横屏失败:', err);
            }
        } else {
            try {
                // 退出全屏前，先解锁屏幕方向
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
                        label={`选择日期 (最多${MAX_DATES}天)`}
                        value={null}
                        onChange={handleDateChange}
                        shouldDisableDate={shouldDisableDate}
                        disabled={!selectedMeter}
                    />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flexGrow: 1 }}>
                        {selectedDates.map(date => (
                            <Chip
                                key={date.toISOString()}
                                label={format(date, 'yyyy-MM-dd')}
                                onDelete={() => handleDeleteDate(date)}
                            />
                        ))}
                    </Box>
                    <Button variant="contained" onClick={handleQuery} disabled={loading || !selectedMeter || selectedDates.length === 0}>
                        {loading ? <CircularProgress size={24} /> : '查询'}
                    </Button>
                </Paper>

                <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>负荷曲线</Typography>
                
                <Box 
                    ref={chartContainerRef} 
                    sx={{ 
                        height: 400, 
                        position: 'relative',
                        backgroundColor: isFullscreen ? 'background.paper' : 'transparent',
                        p: isFullscreen ? 2 : 0
                    }}
                >
                    {/* 全屏切换按钮，更新显示逻辑 */}
                    <Box sx={{
                        position: 'absolute', 
                        top: 8, 
                        right: 8, 
                        zIndex: 10,
                        // 全屏时，按钮始终可见。非全屏时，仅在手机端可见。
                        display: isFullscreen ? 'block' : { xs: 'block', sm: 'none' }
                    }}>
                        <IconButton onClick={handleFullscreenToggle} size="small" color="primary">
                            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                        </IconButton>
                    </Box>

                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" interval={'preserveStartEnd'} tick={{ fontSize: 12 }} />
                            <YAxis label={{ value: '电量 (kWh)', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip unit="kWh" />} />
                            <Legend />
                            <Brush dataKey="time" height={30} stroke="#8884d8" />
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
