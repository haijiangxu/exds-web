
import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Grid,
    TextField,
    Typography,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem
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
interface MonthlyLoadData {
    time_index: number;
    monthly_avg: number;
    workday_avg: number;
    weekend_avg: number;
    holiday_avg: number;
}

export const MonthlyLoadCurveAnalysisTab: React.FC = () => {
    const [data, setData] = useState<MonthlyLoadData[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<Date | null>(new Date());

    useEffect(() => {
        // 生成模拟数据
        const mockData = Array.from({ length: 96 }, (_, i) => ({
            time_index: i,
            monthly_avg: 3000 + Math.sin(i / 10) * 500 + Math.random() * 100,
            workday_avg: 3200 + Math.sin(i / 9) * 600 + Math.random() * 150,
            weekend_avg: 2500 + Math.sin(i / 12) * 400 + Math.random() * 80,
            holiday_avg: 2000 + Math.sin(i / 11) * 300 + Math.random() * 70,
        }));
        setData(mockData);

        // // 以下为连接真实API的代码，暂时注释掉
        // if (selectedMonth) {
        //     setLoading(true);
        //     const formattedMonth = format(selectedMonth, 'yyyy-MM');

        //     apiClient.get(`/api/v1/load_analysis/monthly_curve?month=${formattedMonth}`)
        //         .then(response => {
        //             // 假设API返回的数据已经是MonthlyLoadData[]格式
        //             setData(response.data);
        //         })
        //         .catch(error => console.error('Error fetching monthly load curve:', error))
        //         .finally(() => setLoading(false));
        // }
    }, [selectedMonth]);

    // 模拟时段划分的背景色块
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

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    筛选条件
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <DatePicker
                            enableAccessibleFieldDOMStructure={false}
                            views={['year', 'month']}
                            label="选择月份"
                            minDate={new Date('2020-01-01')}
                            maxDate={new Date()}
                            value={selectedMonth}
                            onChange={setSelectedMonth}
                            slots={{ textField: TextField }}
                            slotProps={{ textField: { fullWidth: true, helperText: null, sx: { minWidth: 180 } } }}
                        />
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
                            data={data}
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
                                label={{ value: '负荷 (kW)', angle: -90, position: 'insideLeft' }}
                                tickFormatter={(value) => value.toFixed(0)}
                            />
                            <Tooltip
                                labelFormatter={formatTick}
                                formatter={(value: number, name: string) => [`${value.toFixed(2)} kW`, name]}
                            />
                            <Legend verticalAlign="top" />
                            
                            {/* 背景时段划分 */}
                            {renderBackgroundRects()}

                            <Line
                                type="monotone"
                                dataKey="monthly_avg"
                                name="月平均负荷"
                                stroke="#8884d8"
                                strokeWidth={3}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="workday_avg"
                                name="工作日平均负荷"
                                stroke="#82ca9d"
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="weekend_avg"
                                name="周末平均负荷"
                                stroke="#ffc658"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="holiday_avg"
                                name="节假日平均负荷"
                                stroke="#ff7300"
                                strokeWidth={2}
                                strokeDasharray="3 3"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </Paper>
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
