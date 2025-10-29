
import React, { useState, useEffect } from 'react';
import { Box, Paper, Grid, TextField, Typography, CircularProgress } from '@mui/material';
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
interface LoadDataPoint {
    time_index: number;
    load: number;
}

export const ConsumptionTrendTab: React.FC = () => {
    const [data, setData] = useState<LoadDataPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());

    useEffect(() => {
        // 生成模拟数据
        const mockData = Array.from({ length: 96 }, (_, i) => ({
            time_index: i,
            load: 3000 + Math.sin(i / 10) * 500 + Math.random() * 300, // 模拟基准负荷+周期性+随机性
        }));
        setData(mockData);

        // // 以下为连接真实API的代码，暂时注释掉
        // if (startDate && endDate) {
        //     setLoading(true);
        //     const formattedStart = format(startDate, 'yyyy-MM-dd');
        //     const formattedEnd = format(endDate, 'yyyy-MM-dd');

        //     apiClient.get(`/api/v1/load_analysis/total_load_curve?start_date=${formattedStart}&end_date=${formattedEnd}`)
        //         .then(response => {
        //             const apiData = response.data.map((val: number, index: number) => ({
        //                 time_index: index,
        //                 load: val,
        //             }));
        //             setData(apiData);
        //         })
        //         .catch(error => console.error('Error fetching total load curve:', error))
        //         .finally(() => setLoading(false));
        // }
    }, [startDate, endDate]);

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
                            label="开始日期"
                            value={startDate}
                            onChange={setStartDate}
                            slots={{ textField: TextField }}
                            slotProps={{ textField: { fullWidth: true, sx: { minWidth: 180 } } }}
                        />
                        <DatePicker
                            enableAccessibleFieldDOMStructure={false}
                            label="结束日期"
                            value={endDate}
                            onChange={setEndDate}
                            slots={{ textField: TextField }}
                            slotProps={{ textField: { fullWidth: true, sx: { minWidth: 180 } } }}
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
                                formatter={(value: number) => [value.toFixed(2), '平均负荷']}
                            />
                            <Legend verticalAlign="top" />
                            <Line
                                type="monotone"
                                dataKey="load"
                                name="总聚合负荷"
                                stroke="#8884d8"
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </Paper>
        </Box>
    );
};
