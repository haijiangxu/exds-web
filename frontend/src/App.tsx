
import React, { useState } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Outlet,
    useNavigate
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

const drawerWidth = 260;

// 一个简单的占位符组件
const PagePlaceholder = ({ pageName }: { pageName: string }) => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Typography variant="h4" color="text.secondary">
            {pageName} 页面建设中...
        </Typography>
    </Box>
);

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
                    {/* Sidebar现在只负责显示，导航由路由处理 */}
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
                            <Route index element={<LoadAnalysisPage />} />
                            <Route path="load-analysis" element={<LoadAnalysisPage />} />
                            <Route path="market-price-analysis" element={<MarketPriceAnalysisPage />} />
                            <Route path="data-import" element={<PagePlaceholder pageName="数据导入" />} />
                            <Route path="home" element={<PagePlaceholder pageName="首页" />} />
                            <Route path="master-data" element={<PagePlaceholder pageName="主数据管理" />} />
                            <Route path="trading-desk" element={<PagePlaceholder pageName="交易管理" />} />
                            <Route path="settlement" element={<PagePlaceholder pageName="结算管理" />} />
                            <Route path="system" element={<PagePlaceholder pageName="系统管理" />} />
                        </Route>
                    </Route>
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;
