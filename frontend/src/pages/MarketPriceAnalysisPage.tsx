
import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, Breadcrumbs,Paper } from '@mui/material';
import { PriceCurveComparisonTab } from '../components/PriceCurveComparisonTab';
import { TimeslotAnalysisTab } from '../components/TimeslotAnalysisTab';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`analysis-tabpanel-${index}`}
            aria-labelledby={`analysis-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ pt: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export const MarketPriceAnalysisPage: React.FC = () => {
    const [tabIndex, setTabIndex] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    return (
        <Box sx={{ width: '100%' }}>
            {/* 页面标题 */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 600 }}>
                    分析与预测
                </Typography>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 600 }}>
                    市场价格分析
                </Typography>
            </Breadcrumbs>

            <Paper variant="outlined" sx={{ borderColor: 'divider' }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="market price analysis tabs">
                    <Tab label="现货价格曲线" id="analysis-tab-0" aria-controls="analysis-tabpanel-0" />
                    <Tab label="时段价格曲线" id="analysis-tab-1" aria-controls="analysis-tabpanel-1" />
                </Tabs>
            </Paper>
            <TabPanel value={tabIndex} index={0}>
                <PriceCurveComparisonTab />
            </TabPanel>
            <TabPanel value={tabIndex} index={1}>
                <TimeslotAnalysisTab />
            </TabPanel>
        </Box>
    );
};
