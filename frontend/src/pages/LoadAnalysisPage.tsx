
import React, { useState } from 'react';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Paper,
    Breadcrumbs,
} from '@mui/material';
import { ConsumptionTrendTab } from '../components/ConsumptionTrendTab';
import { MonthlyLoadCurveAnalysisTab } from '../components/MonthlyLoadCurveAnalysisTab';
import { DailyLoadCurveAnalysisTab } from '../components/DailyLoadCurveAnalysisTab';

// TabPanel组件
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
            id={`overall-analysis-tabpanel-${index}`}
            aria-labelledby={`overall-analysis-tab-${index}`}
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

export const LoadAnalysisPage: React.FC = () => {
    const [overallActiveTab, setOverallActiveTab] = useState(0);

    const handleOverallTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setOverallActiveTab(newValue);
    };

    return (
        <Box sx={{ width: '100%' }}>
            {/* 页面标题 */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 600 }}>
                    分析与预测
                </Typography>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 600 }}>
                    总体负荷分析
                </Typography>
            </Breadcrumbs>

            {/* 主内容卡片 */}
            <Paper variant="outlined" sx={{ borderColor: 'divider' }}>
                <Tabs value={overallActiveTab} onChange={handleOverallTabChange} aria-label="overall load analysis tabs">
                    <Tab label="电量趋势" id="overall-analysis-tab-0" aria-controls="overall-analysis-tabpanel-0" />
                    <Tab label="月度曲线分析" id="overall-analysis-tab-1" aria-controls="overall-analysis-tabpanel-1" />
                    <Tab label="日负荷曲线分析" id="overall-analysis-tab-2" aria-controls="overall-analysis-tabpanel-2" />
                </Tabs>
            </Paper>
            <TabPanel value={overallActiveTab} index={0}>
                <ConsumptionTrendTab />
            </TabPanel>
            <TabPanel value={overallActiveTab} index={1}>
                <MonthlyLoadCurveAnalysisTab />
            </TabPanel>
            <TabPanel value={overallActiveTab} index={2}>
                <DailyLoadCurveAnalysisTab />
            </TabPanel>
        </Box>
    );
};
