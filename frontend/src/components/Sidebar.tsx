import React from 'react';
import {
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Toolbar,
    ListSubheader,
    Box
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import BackupTableIcon from '@mui/icons-material/BackupTable';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TimelineIcon from '@mui/icons-material/Timeline';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PaymentIcon from '@mui/icons-material/Payment';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';

// 定义菜单项的类型
interface MenuItemDef {
    text: string;
    icon?: React.ReactElement;
    path?: string;
    isHeader?: boolean;
}

const menuItems: MenuItemDef[] = [
    { text: '首页', icon: <HomeIcon />, path: '/home' },
    { text: '数据中心', isHeader: true },
    { text: '数据导入', icon: <UploadFileIcon />, path: '/data-import' },
    { text: '主数据管理', icon: <BackupTableIcon />, path: '/master-data' },
    { text: '分析与预测', isHeader: true },
    { text: '总体负荷分析', icon: <TimelineIcon />, path: '/load-analysis' },
    { text: '市场价格分析', icon: <PriceChangeIcon />, path: '/market-price-analysis' },
    { text: '交易管理', isHeader: true },
    { text: '市场申报', icon: <AssessmentIcon />, path: '/trading-desk' },
    { text: '结算管理', isHeader: true },
    { text: '用户电费测算', icon: <PaymentIcon />, path: '/settlement' },
    { text: '系统管理', isHeader: true },
    { text: '用户与权限', icon: <SettingsIcon />, path: '/system' },
];

export const Sidebar: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Toolbar />
            <Divider />
            <List component="nav" dense={true} sx={{ flexGrow: 1 }}>
                {menuItems.map((item) => {
                    if (item.isHeader) {
                        return (
                            <ListSubheader key={item.text} component="div" sx={{ bgcolor: 'inherit', mt: 1 }}>
                                {item.text}
                            </ListSubheader>
                        );
                    }
                    return (
                        <ListItem key={item.text} disablePadding sx={{ pl: 1, pr: 1}}>
                            <ListItemButton 
                                component={Link}
                                to={item.path || '#'}
                                selected={location.pathname === item.path || (location.pathname === '/' && item.path === '/load-analysis')}
                                sx={{ borderRadius: '8px' }}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
            <Divider />
            <List component="nav" dense={true}>
                <ListItem disablePadding sx={{ pl: 1, pr: 1}}>
                    <ListItemButton onClick={handleLogout} sx={{ borderRadius: '8px' }}>
                        <ListItemIcon sx={{ minWidth: 40 }}><LogoutIcon /></ListItemIcon>
                        <ListItemText primary="退出登录" />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );
};