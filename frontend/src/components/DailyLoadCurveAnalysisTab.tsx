
import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Grid,
    TextField,
    Typography,
    CircularProgress,
    Chip,
    Button,
    Switch,
    FormControlLabel
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../api/client';
import { format } from 'date-fns';

// 将 96 点的索引转换为 HH:mm 格式的时间字符串
const formatTick = (tick: number) => {
    const hour = Math.floor(tick / 4).toString().padStart(2, '0');
    const minute = ((tick % 4) * 15).toString().padStart(2, '0');
    return `${hour}:${minute}`;
};

// 模拟API返回的数据结构
interface DailyLoadData {
    time_index: number;
    load: number;
    temperature?: number; // 可选的温度数据
}

export const DailyLoadCurveAnalysisTab: React.FC = () => {
    const [selectedDates, setSelectedDates] = useState<Array<Date | null>>([new Date()]);
    const [data, setData] = useState<{[key: string]: DailyLoadData[]}>({}); // 按日期存储数据
    const [loading, setLoading] = useState(false);
    const [showDifference, setShowDifference] = useState(false);
    const [overlayTemperature, setOverlayTemperature] = useState(false);

    useEffect(() => {
        // Only generate mock data if there's at least one valid date selected
        const validDates = selectedDates.filter(Boolean); // Filter out nulls
        if (validDates.length === 0) {
            setData({}); // Clear data if no valid dates
            return;
        }

        const mockData: {[key: string]: DailyLoadData[]} = {};
        validDates.forEach((date, index) => { // Iterate over validDates
            const dateKey = format(date!, 'yyyy-MM-dd'); // date is guaranteed not null here
            mockData[dateKey] = Array.from({ length: 96 }, (_, i) => ({
                    time_index: i,
                    load: 3000 + Math.sin(i / 10 + index) * 500 + Math.random() * 300,
                    temperature: 20 + Math.sin(i / 20) * 10 + Math.random() * 2, // 模拟温度
                }));
        });
        setData(mockData);

        // // 以下为连接真实API的代码，暂时注释掉
        // if (selectedDates.length > 0 && selectedDates.every(d => d !== null)) {
        //     setLoading(true);
        //     const formattedDates = selectedDates.map(d => format(d!, 'yyyy-MM-dd')).join(',');

        //     apiClient.get(`/api/v1/load_analysis/daily_curve?dates=${formattedDates}`)
        //         .then(response => {
        //             // 假设API返回的数据是 { 'yyyy-MM-dd': DailyLoadData[] } 格式
        //             setData(response.data);
        //         })
        //         .catch(error => console.error('Error fetching daily load curve:', error))
        //         .finally(() => setLoading(false));
        // }
    }, [selectedDates]);

    const handleAddDate = () => {
        setSelectedDates([...selectedDates, null]);
    };

    const handleDateChange = (date: Date | null, index: number) => {
        const newDates = [...selectedDates];
        newDates[index] = date;
        setSelectedDates(newDates);
    };

    const handleRemoveDate = (index: number) => {
        const newDates = selectedDates.filter((_, i) => i !== index);
        setSelectedDates(newDates.length > 0 ? newDates : [null]); // 至少保留一个日期选择器
    };

    const renderBackgroundRects = () => {
        // 示例时段划分，实际应从配置或API获取
        const timePeriods = [
            { start: 0, end: 28, type: '谷', color: '#e0f2f7' }, // 00:00 - 07:00
            { start: 28, end: 44, type: '平', color: '#fffde7' }, // 07:00 - 11:00
            { start: 44, end: 72, type: '峰', color: '#ffebee' }, // 11:00 - 18:00
            { start: 72, end: 88, type: '平', color: '#fffde7' }, // 18:00 - 22:00
            { start: 88, end: 96, type: '谷', color: '#e0f2f7' }, // 22:00 - 24:00
        ];

        return timePeriods.map((period, index) => (
            <rect
                key={index}
                x={period.start * (500 / 96)} // 假设图表宽度为500，需要根据实际ResponsiveContainer的宽度调整
                y={0}
                width={(period.end - period.start) * (500 / 96)}
                height="100%"
                fill={period.color}
                opacity={0.6}
            />
        ));
    };

    // 计算差值数据
    const differenceData = React.useMemo(() => {
        if (!showDifference || selectedDates.length !== 2 || !selectedDates[0] || !selectedDates[1]) {
            return [];
        }
        const date1Key = format(selectedDates[0]!, 'yyyy-MM-dd');
        const date2Key = format(selectedDates[1]!, 'yyyy-MM-dd');
        const data1 = data[date1Key] || [];
        const data2 = data[date2Key] || [];

        return Array.from({ length: 96 }, (_, i) => ({
            time_index: i,
            difference: (data1[i]?.load || 0) - (data2[i]?.load || 0),
        }));
    }, [showDifference, selectedDates, data]);

    const hasTemperatureData = Object.values(data).some(dayData => dayData.some(point => point.temperature !== undefined));

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    筛选条件
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {selectedDates.map((date, index) => (
                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                                    <DatePicker
                                                                        enableAccessibleFieldDOMStructure={false}
                                                                        label={`选择日期 ${index + 1}`}
                                                                        value={date}
                                                                        onChange={(newDate) => handleDateChange(newDate, index)}
                                                                        slots={{ textField: TextField }}
                                                                        slotProps={{ textField: { fullWidth: true, sx: { minWidth: 180 } } }}
                                                                    />                                {selectedDates.length > 1 && (
                                    <Button onClick={() => handleRemoveDate(index)} color="error" variant="outlined">
                                        移除
                                    </Button>
                                )}
                            </Box>
                        ))}
                        <Box>
                            <Button onClick={handleAddDate} variant="outlined">
                                添加日期
                            </Button>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                            <FormControlLabel
                                control={<Switch checked={overlayTemperature} onChange={(e) => setOverlayTemperature(e.target.checked)} disabled={!hasTemperatureData} />}
                                label="叠加温度曲线"
                            />
                            <FormControlLabel
                                control={<Switch checked={showDifference} onChange={(e) => setShowDifference(e.target.checked)} disabled={selectedDates.length !== 2 || !selectedDates[0] || !selectedDates[1]} />}
                                label="显示差值曲线 (仅限2个日期)"
                            />
                        </Box>
                    </Box>
                </LocalizationProvider>
            </Paper>

            <Paper sx={{ p: 2, height: 500 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={Object.values(data)[0] || []} // 默认取第一个日期的数据作为基础，Recharts需要一个基础data
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="time_index"
                                tickFormatter={formatTick}
                                ticks={[0, 12, 24, 36, 48, 60, 72, 84, 95]} // 每3小时一个刻度
                                label={{ value: '时间 (24小时)', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis
                                yAxisId="left"
                                label={{ value: '负荷 (kW)', angle: -90, position: 'insideLeft' }}
                                tickFormatter={(value) => value.toFixed(0)}
                            />
                            {overlayTemperature && hasTemperatureData && (
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    label={{ value: '温度 (°C)', angle: 90, position: 'insideRight' }}
                                    tickFormatter={(value) => value.toFixed(0)}
                                />
                            )}
                            <Tooltip
                                labelFormatter={formatTick}
                                formatter={(value: number, name: string) => [`${value.toFixed(2)} ${name.includes('温度') ? '°C' : 'kW'}`, name]}
                            />
                            <Legend verticalAlign="top" />

                            {/* 背景时段划分 */}
                            {renderBackgroundRects()}

                            {Object.entries(data).map(([dateKey, dailyData], index) => (
                                <Line
                                    key={dateKey}
                                    yAxisId="left"
                                    type="monotone"
                                    data={dailyData}
                                    dataKey="load"
                                    name={`${dateKey} 负荷`}
                                    stroke={["#8884d8", "#82ca9d", "#ffc658"][index % 3]}
                                    strokeWidth={2}
                                    dot={false}
                                />
                            ))}
                            {overlayTemperature && hasTemperatureData && Object.entries(data).map(([dateKey, dailyData], index) => (
                                <Line
                                    key={`${dateKey}-temp`}
                                    yAxisId="right"
                                    type="monotone"
                                    data={dailyData}
                                    dataKey="temperature"
                                    name={`${dateKey} 温度`}
                                    stroke={["#a4de6c", "#d0ed57", "#83a6ed"][index % 3]}
                                    strokeWidth={1}
                                    strokeDasharray="3 3"
                                    dot={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </Paper>

            {showDifference && differenceData.length > 0 && (
                <Paper sx={{ p: 2, mt: 3, height: 200 }}>
                    <Typography variant="h6" gutterBottom>负荷差值曲线</Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={differenceData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="time_index"
                                tickFormatter={formatTick}
                                ticks={[0, 12, 24, 36, 48, 60, 72, 84, 95]}
                                label={{ value: '时间 (24小时)', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis
                                label={{ value: '差值 (kW)', angle: -90, position: 'insideLeft' }}
                                tickFormatter={(value) => value.toFixed(0)}
                            />
                            <Tooltip
                                labelFormatter={formatTick}
                                formatter={(value: number) => [`${value.toFixed(2)} kW`, '差值']}
                            />
                            <Line
                                type="monotone"
                                dataKey="difference"
                                name="差值"
                                stroke="#ff0000"
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            )}

            {/* 关键指标对比表格 */}
            <Paper sx={{ p: 2, mt: 3 }}>
                <Typography variant="h6" gutterBottom>关键指标对比</Typography>
                <Box sx={{ mt: 2 }}>
                    {/* 这是一个占位符，实际应根据数据动态生成表格 */}
                    <Typography>表格内容待实现...</Typography>
                </Box>
            </Paper>
        </Box>
    );
};
