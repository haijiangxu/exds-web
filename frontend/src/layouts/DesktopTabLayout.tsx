import React, { useState, useEffect } from 'react';
import {
    Box,
    AppBar,
    Toolbar,
    Typography,
    Drawer,
    IconButton,
    Tabs,
    Tab,
    Menu,
    MenuItem,
    Divider,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { Sidebar } from '../components/Sidebar';
import { useTabContext } from '../contexts/TabContext';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 260;

export const DesktopTabLayout: React.FC = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { openTabs, activeTabKey, setActiveTab, removeTab } = useTabContext();
    const [currentDateTime, setCurrentDateTime] = useState(new Date());
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();

    // 实时更新日期时间
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentDateTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 格式化日期时间显示
    const formatDateTime = (date: Date) => {
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const weekday = weekdays[date.getDay()];
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${weekday} ${hours}:${minutes}`;
    };

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        setActiveTab(newValue);
    };

    const handleTabClose = (event: React.MouseEvent, tabKey: string) => {
        event.stopPropagation();
        removeTab(tabKey);
    };

    const handleAccountMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleAccountMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleAccountMenuClose();
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
            {/* 顶部工具栏 */}
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    boxShadow: 'none',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
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

                    {/* 右侧工具栏（仅桌面端显示） */}
                    <Box sx={{ flexGrow: 1 }} />
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3 }}>
                        {/* 日期时间 */}
                        <Typography variant="body2" sx={{ color: 'inherit' }}>
                            {formatDateTime(currentDateTime)}
                        </Typography>

                        {/* 账号菜单 */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                cursor: 'pointer',
                                '&:hover': {
                                    opacity: 0.8,
                                },
                            }}
                            onClick={handleAccountMenuOpen}
                        >
                            <AccountCircleIcon />
                            <Typography variant="body2">管理员</Typography>
                        </Box>
                    </Box>

                    {/* 账号下拉菜单 */}
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleAccountMenuClose}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                    >
                        <MenuItem onClick={handleLogout}>
                            <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                            退出系统
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>

            {/* 侧边栏 */}
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                {/* 移动端抽屉 */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                            borderRight: 'none',
                        },
                    }}
                >
                    <Sidebar />
                </Drawer>
                {/* 桌面端抽屉 */}
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                            borderRight: 'none',
                        },
                    }}
                    open
                >
                    <Sidebar />
                </Drawer>
            </Box>

            {/* 主内容区 */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Toolbar />

                {/* 页签栏 */}
                {openTabs.length > 0 && (
                    <Box
                        sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                        }}
                    >
                        <Tabs
                            value={activeTabKey}
                            onChange={handleTabChange}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                minHeight: 48,
                                '& .MuiTab-root': {
                                    minHeight: 48,
                                    textTransform: 'none',
                                },
                            }}
                        >
                            {openTabs.map((tab) => (
                                <Tab
                                    key={tab.key}
                                    value={tab.key}
                                    label={
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}
                                        >
                                            <span>{tab.title}</span>
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleTabClose(e, tab.key)}
                                                sx={{
                                                    padding: '2px',
                                                    '&:hover': {
                                                        bgcolor: 'action.hover',
                                                    },
                                                }}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    }
                                />
                            ))}
                        </Tabs>
                    </Box>
                )}

                {/* 页签内容区 */}
                <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
                    {openTabs.length === 0 ? (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: 'text.secondary',
                            }}
                        >
                            <Typography variant="h6">
                                请从左侧菜单选择要打开的页面
                            </Typography>
                        </Box>
                    ) : (
                        openTabs.map((tab) => (
                            <Box
                                key={tab.key}
                                sx={{
                                    display: activeTabKey === tab.key ? 'block' : 'none',
                                }}
                            >
                                {tab.component}
                            </Box>
                        ))
                    )}
                </Box>
            </Box>
        </Box>
    );
};
