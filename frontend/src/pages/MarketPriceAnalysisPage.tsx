
import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, Breadcrumbs, Paper } from '@mui/material';
import { MarketDashboardTab } from '../components/MarketDashboardTab';
import { DayAheadAnalysisTab } from '../components/DayAheadAnalysisTab'; // 导入新组件
import { RealTimeAnalysisTab } from '../components/RealTimeAnalysisTab'; // 导入新组件
import { SpreadAnalysisTab } from '../components/SpreadAnalysisTab'; // 导入新组件
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
            {/* 移除条件渲染，让Tab内容常驻，仅通过CSS显隐 */}
            <Box sx={{ pt: 3 }}>
                {children}
            </Box>
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
                <Tabs
                    value={tabIndex}
                    onChange={handleTabChange}
                    aria-label="market price analysis tabs"
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{
                        '& .MuiTabs-scrollButtons': {
                            '&.Mui-disabled': { opacity: 0.3 }
                        },
                        '& .MuiTab-root': {
                            minWidth: { xs: '45%', sm: 120 }, // 移动端每个Tab占45%宽度，确保只显示2个
                            maxWidth: { xs: '45%', sm: 'none' }, // 移动端限制最大宽度
                            fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                            px: { xs: 1, sm: 2 } // 移动端减少内边距
                        }
                    }}
                >
                    <Tab label="市场价格总览" id="analysis-tab-0" aria-controls="analysis-tabpanel-0" />
                    <Tab label="日前市场分析" id="analysis-tab-2" aria-controls="analysis-tabpanel-1" />
                    <Tab label="现货市场复盘" id="analysis-tab-3" aria-controls="analysis-tabpanel-2" />
                    <Tab label="价差归因分析" id="analysis-tab-4" aria-controls="analysis-tabpanel-3" />
                    <Tab label="时段价格曲线" id="analysis-tab-5" aria-controls="analysis-tabpanel-4" />
                    <Tab label="现货价格曲线" id="analysis-tab-1" aria-controls="analysis-tabpanel-5" />

                </Tabs>
            </Paper>
            <TabPanel value={tabIndex} index={0}>
                <MarketDashboardTab />
            </TabPanel>
            <TabPanel value={tabIndex} index={1}>
               <DayAheadAnalysisTab />
            </TabPanel>
            <TabPanel value={tabIndex} index={2}>
                <RealTimeAnalysisTab />
            </TabPanel>
            <TabPanel value={tabIndex} index={3}>
                <SpreadAnalysisTab />
            </TabPanel>
            <TabPanel value={tabIndex} index={4}>
                <TimeslotAnalysisTab />
            </TabPanel>
            <TabPanel value={tabIndex} index={5}>
                <PriceCurveComparisonTab />
            </TabPanel>
        </Box>
    );
};
