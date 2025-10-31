
import React, { useState } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Outlet,
} from 'react-router-dom';
import {
    Box,
    CssBaseline,
    AppBar,
    Toolbar,
    Typography,
    Drawer,
    IconButton,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import MenuIcon from '@mui/icons-material/Menu';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import { Sidebar } from './components/Sidebar';
import { LoadAnalysisPage } from './pages/LoadAnalysisPage';
import { MarketPriceAnalysisPage } from './pages/MarketPriceAnalysisPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import PlaceholderPage from './components/PlaceholderPage';
import GridAgencyPricePage from './pages/GridAgencyPricePage';

const drawerWidth = 260;

// 主布局组件，包含导航和工具栏
const MainLayout: React.FC = () => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    return (
        <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    boxShadow: 'none',
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <InsightsIcon sx={{ mr: 1.5 }} />
                    <Typography variant="h6" noWrap component="div">
                        电力交易辅助分析系统
                    </Typography>
                </Toolbar>
            </AppBar>
            
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' },
                    }}
                >
                    <Sidebar />
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' },
                    }}
                    open
                >
                    <Sidebar />
                </Drawer>
            </Box>

            <Box
                component="main"
                sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
            >
                <Toolbar />
                {/* 子页面将在这里渲染 */}
                <Outlet />
            </Box>
        </Box>
    );
};


function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<MainLayout />}>
                            {/* 默认页重定向到第一个有内容的页面 */}
                            <Route index element={<LoadAnalysisPage />} />

                            {/* 菜单路由 */}
                            <Route path="dashboard" element={<PlaceholderPage />} />
                            
                            {/* 客户管理 */}
                            <Route path="customer/profiles" element={<PlaceholderPage />} />
                            <Route path="customer/retail-packages" element={<PlaceholderPage />} />
                            <Route path="customer/load-characteristics" element={<LoadAnalysisPage />} />
                            <Route path="customer/cluster-analysis" element={<PlaceholderPage />} />

                            {/* 负荷预测 */}
                            <Route path="load-forecast/overall-analysis" element={<LoadAnalysisPage />} />
                            <Route path="load-forecast/short-term" element={<PlaceholderPage />} />
                            <Route path="load-forecast/accuracy-analysis" element={<PlaceholderPage />} />
                            <Route path="load-forecast/long-term" element={<PlaceholderPage />} />

                            {/* 价格预测 */}
                            <Route path="price-forecast/market-analysis" element={<MarketPriceAnalysisPage />} />
                            <Route path="price-forecast/d-2" element={<PlaceholderPage />} />
                            <Route path="price-forecast/day-ahead" element={<PlaceholderPage />} />
                            <Route path="price-forecast/monthly" element={<PlaceholderPage />} />

                            {/* 交易决策 */}
                            <Route path="trading-strategy/contract-curve" element={<PlaceholderPage />} />
                            <Route path="trading-strategy/monthly" element={<PlaceholderPage />} />
                            <Route path="trading-strategy/d-2" element={<PlaceholderPage />} />
                            <Route path="trading-strategy/day-ahead" element={<PlaceholderPage />} />

                            {/* 风险管理 */}
                            <Route path="risk-management/deviation" element={<PlaceholderPage />} />
                            <Route path="risk-management/exposure" element={<PlaceholderPage />} />

                            {/* 结算管理 */}
                            <Route path="settlement/pre-settlement" element={<PlaceholderPage />} />
                            <Route path="settlement/bill-review" element={<PlaceholderPage />} />
                            <Route path="settlement/profit-analysis" element={<PlaceholderPage />} />

                            {/* 基础数据 */}
                            <Route path="basic-data/grid-price" element={<GridAgencyPricePage />} />
                            <Route path="basic-data/tou-definition" element={<PlaceholderPage />} />
                            <Route path="basic-data/load-validation" element={<PlaceholderPage />} />

                            {/* 系统管理 */}
                            <Route path="system-settings/user-permissions" element={<PlaceholderPage />} />
                            <Route path="system-settings/data-access" element={<PlaceholderPage />} />
                            <Route path="system-settings/model-parameters" element={<PlaceholderPage />} />

                        </Route>
                    </Route>
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;
