
import React from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
} from 'react-router-dom';
import {
    CssBaseline,
    useMediaQuery,
} from '@mui/material';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import theme from './theme';
import { LoadAnalysisPage } from './pages/LoadAnalysisPage';
import { MarketPriceAnalysisPage } from './pages/MarketPriceAnalysisPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import PlaceholderPage from './components/PlaceholderPage';
import GridAgencyPricePage from './pages/GridAgencyPricePage';
import { TabProvider } from './contexts/TabContext';
import { AuthProvider } from './contexts/AuthContext';
import { DesktopTabLayout } from './layouts/DesktopTabLayout';
import { MobileSimpleLayout } from './layouts/MobileSimpleLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 响应式布局选择组件
const ResponsiveLayout: React.FC = () => {
    const theme = useTheme();
    // 使用 md 断点（960px）作为桌面端和移动端的分界
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    if (isDesktop) {
        // 桌面端：使用多页签布局
        return <DesktopTabLayout />;
    } else {
        // 移动端：使用单页布局，需要配置路由
        return (
            <Routes>
                <Route path="/" element={<MobileSimpleLayout />}>
                    {/* 默认页 */}
                    <Route index element={<LoadAnalysisPage />} />

                    {/* 菜单路由 */}
                    <Route path="dashboard" element={<PlaceholderPage />} />

                    {/* 客户管理 */}
                    <Route path="customer/profiles" element={<PlaceholderPage />} />
                    <Route path="customer/retail-contracts" element={<PlaceholderPage />} />
                    <Route path="customer/load-analysis" element={<LoadAnalysisPage />} />
                    <Route path="customer/cluster-analysis" element={<PlaceholderPage />} />

                    {/* 负荷预测 */}
                    <Route path="load-forecast/overall-analysis" element={<LoadAnalysisPage />} />
                    <Route path="load-forecast/short-term" element={<PlaceholderPage />} />
                    <Route path="load-forecast/accuracy-analysis" element={<PlaceholderPage />} />
                    <Route path="load-forecast/long-term" element={<PlaceholderPage />} />

                    {/* 价格分析 */}
                    <Route path="price-analysis/spot-market" element={<MarketPriceAnalysisPage />} />
                    <Route path="price-analysis/mid-long-term" element={<PlaceholderPage />} />
                    <Route path="price-analysis/comparison" element={<PlaceholderPage />} />

                    {/* 价格预测 */}
                    <Route path="price-forecast/baseline-data" element={<PlaceholderPage />} />
                    <Route path="price-forecast/d-2" element={<PlaceholderPage />} />
                    <Route path="price-forecast/day-ahead" element={<PlaceholderPage />} />
                    <Route path="price-forecast/monthly" element={<PlaceholderPage />} />

                    {/* 交易决策 */}
                    <Route path="trading-strategy/contract-curve" element={<PlaceholderPage />} />
                    <Route path="trading-strategy/monthly" element={<PlaceholderPage />} />
                    <Route path="trading-strategy/d-2" element={<PlaceholderPage />} />
                    <Route path="trading-strategy/day-ahead" element={<PlaceholderPage />} />

                    {/* 风险管理 */}
                    <Route path="risk-management/position-contracts" element={<PlaceholderPage />} />
                    <Route path="risk-management/exposure" element={<PlaceholderPage />} />

                    {/* 结算管理 */}
                    <Route path="settlement/wholesale-pre-settlement" element={<PlaceholderPage />} />
                    <Route path="settlement/bill-review" element={<PlaceholderPage />} />
                    <Route path="settlement/retail-settlement" element={<PlaceholderPage />} />
                    <Route path="settlement/profit-analysis" element={<PlaceholderPage />} />

                    {/* 基础数据 */}
                    <Route path="basic-data/grid-price" element={<GridAgencyPricePage />} />
                    <Route path="basic-data/tou-definition" element={<PlaceholderPage />} />
                    <Route path="basic-data/retail-packages" element={<PlaceholderPage />} />
                    <Route path="basic-data/load-validation" element={<PlaceholderPage />} />

                    {/* 系统管理 */}
                    <Route path="system-settings/user-permissions" element={<PlaceholderPage />} />
                    <Route path="system-settings/data-access" element={<PlaceholderPage />} />
                    <Route path="system-settings/model-parameters" element={<PlaceholderPage />} />
                </Route>
            </Routes>
        );
    }
};

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <QueryClientProvider client={queryClient}>
                <Router>
                    <AuthProvider>
                        <Routes>
                            {/* 登录页面 */}
                            <Route path="/login" element={<LoginPage />} />

                            {/* 受保护的路由 */}
                            <Route element={<ProtectedRoute />}>
                                <Route
                                    path="/*"
                                    element={
                                        <TabProvider>
                                            <ResponsiveLayout />
                                        </TabProvider>
                                    }
                                />
                            </Route>
                        </Routes>
                    </AuthProvider>
                </Router>
            </QueryClientProvider>
        </ThemeProvider>
    );
}

export default App;
