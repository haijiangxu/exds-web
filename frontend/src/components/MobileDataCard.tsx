
import React from 'react';
import { Paper, Box, Typography, Button, Divider } from '@mui/material';

// This interface should match the one in GridAgencyPricePage.tsx
interface SGCCPriceData {
    _id: string; // format: "YYYY-MM"
    purchase_price: number;
    avg_on_grid_price: number;
    purchase_scale_kwh: number;
}

interface MobileDataCardProps {
    data: SGCCPriceData;
    onViewPdf: () => void; // Add this prop to handle the action in the parent
}

const DataRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight="bold">{value}</Typography>
    </Box>
);

export const MobileDataCard: React.FC<MobileDataCardProps> = ({ data, onViewPdf }) => {
    return (
        <Paper sx={{ p: 2, mb: 2 }} elevation={2}>
            <Typography variant="h6" gutterBottom>{data._id} 月份</Typography>
            <Divider sx={{ mb: 1 }} />
            <DataRow 
                label="代理购电价格 (元/kWh)" 
                value={data.purchase_price.toFixed(5)} 
            />
            <DataRow 
                label="平均上网电价 (元/kWh)" 
                value={data.avg_on_grid_price.toFixed(5)} 
            />
            <DataRow 
                label="代理购电规模 (万kWh)" 
                value={(data.purchase_scale_kwh / 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            />
            <Divider sx={{ mt: 1 }} />
            <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button variant="contained" size="small" onClick={onViewPdf}>
                    查看公告
                </Button>
            </Box>
        </Paper>
    );
};
