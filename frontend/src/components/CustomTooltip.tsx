import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

// Tooltip从Recharts接收的属性类型
interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
    unit?: string; // 允许传入单位
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, unit = '' }) => {
    if (active && payload && payload.length) {
        // 从数据点中获取时段类型
        const periodType = payload[0].payload.period_type;

        return (
            <Paper sx={{ p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #ccc' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {`时间: ${label}`}{periodType && ` (${periodType})`}
                </Typography>
                {payload.map((pld, index) => {
                    // 检查value是否存在且为数字
                    const valueIsValid = pld.value !== null && pld.value !== undefined && typeof pld.value === 'number';
                    // 对于区域填充（如positiveDiff），我们不显示其具体值
                    if (pld.dataKey === 'positiveDiff' || pld.dataKey === 'negativeDiff') {
                        return null;
                    }

                    const displayValue = valueIsValid ? pld.value.toFixed(2) : 'N/A';

                    return (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: 10, height: 10, backgroundColor: pld.color || pld.stroke, mr: 1, borderRadius: '50%' }} />
                            <Typography variant="body2" sx={{ color: pld.color || pld.stroke }}>
                                {`${pld.name}: `}
                                <Box component="span" sx={{ fontWeight: 'bold' }}>
                                    {displayValue} {valueIsValid ? unit : ''}
                                </Box>
                            </Typography>
                        </Box>
                    );
                })}
            </Paper>
        );
    }

    return null;
};