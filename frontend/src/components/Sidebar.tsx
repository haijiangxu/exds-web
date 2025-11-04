import React, { useState, useEffect } from 'react';
import {
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Toolbar,
    Box,
    Collapse
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    DashboardOutlined as DashboardIcon,
    PeopleOutlined as PeopleIcon,
    TimelineOutlined as TimelineIcon,
    PriceChangeOutlined as PriceChangeIcon,
    GavelOutlined as GavelIcon,
    ShieldOutlined as ShieldIcon,
    PaymentOutlined as PaymentIcon,
    AssessmentOutlined as AssessmentIcon,
    SettingsOutlined as SettingsIcon,
    LogoutOutlined as LogoutIcon,
    ExpandLess,
    ExpandMore,
    AccountBoxOutlined,
    StyleOutlined,
    ShowChartOutlined,
    BubbleChartOutlined,
    StackedLineChartOutlined,
    QueryStatsOutlined,
    RuleOutlined,
    CalendarMonthOutlined,
    AnalyticsOutlined,
    CrisisAlertOutlined,
    TrendingUpOutlined,
    FunctionsOutlined,
    FactCheckOutlined,
    RequestQuoteOutlined,
    VerifiedUserOutlined,
    StorageOutlined,
    ModelTrainingOutlined,
    SourceOutlined,
    VpnKeyOutlined,
    BarChartOutlined
} from '@mui/icons-material';
import { useTabContext } from '../contexts/TabContext';
import { getRouteConfig } from '../config/routes';

// 定义菜单项类型
interface SubMenuItem {
    text: string;
    path: string;
    icon: React.ReactElement;
}

interface MenuItem {
    text: string;
    icon: React.ReactElement;
    path?: string;
    subItems?: SubMenuItem[];
}

// 根据系统菜单规划.md定义新的菜单结构
const menuItems: MenuItem[] = [
    { text: '交易总览', icon: <DashboardIcon />, path: '/dashboard' },
    {
        text: '客户管理',
        icon: <PeopleIcon />,
        subItems: [
            { text: '客户档案管理', path: '/customer/profiles', icon: <AccountBoxOutlined /> },
            { text: '零售合同管理', path: '/customer/retail-contracts', icon: <StyleOutlined /> },
            { text: '客户负荷分析', path: '/customer/load-analysis', icon: <ShowChartOutlined /> },
            { text: '客户聚类分析', path: '/customer/cluster-analysis', icon: <BubbleChartOutlined /> },
        ],
    },
    {
        text: '负荷预测',
        icon: <TimelineIcon />,
        subItems: [
            { text: '总体负荷分析', path: '/load-forecast/overall-analysis', icon: <StackedLineChartOutlined /> },
            { text: '短期负荷预测', path: '/load-forecast/short-term', icon: <QueryStatsOutlined /> },
            { text: '预测精度分析', path: '/load-forecast/accuracy-analysis', icon: <RuleOutlined /> },
            { text: '中长期负荷预测', path: '/load-forecast/long-term', icon: <CalendarMonthOutlined /> },
        ],
    },
    {
        text: '价格分析',
        icon: <PriceChangeIcon />,
        subItems: [
            { text: '现货价格分析', path: '/price-analysis/spot-market', icon: <AnalyticsOutlined /> },
            { text: '中长期价格分析', path: '/price-analysis/mid-long-term', icon: <TrendingUpOutlined /> },
            { text: '价格对比分析', path: '/price-analysis/comparison', icon: <BarChartOutlined /> },
        ],
    },
    {
        text: '价格预测',
        icon: <QueryStatsOutlined />,
        subItems: [
            { text: '预测基础数据', path: '/price-forecast/baseline-data', icon: <StorageOutlined /> },
            { text: 'D-2价格预测', path: '/price-forecast/d-2', icon: <CrisisAlertOutlined /> },
            { text: '日前价格预测', path: '/price-forecast/day-ahead', icon: <TrendingUpOutlined /> },
            { text: '月度价格预测', path: '/price-forecast/monthly', icon: <CalendarMonthOutlined /> },
        ],
    },
    {
        text: '交易决策',
        icon: <GavelIcon />,
        subItems: [
            { text: '合同曲线生成', path: '/trading-strategy/contract-curve', icon: <FunctionsOutlined /> },
            { text: '月度交易策略', path: '/trading-strategy/monthly', icon: <CalendarMonthOutlined /> },
            { text: 'D-2交易策略', path: '/trading-strategy/d-2', icon: <CrisisAlertOutlined /> },
            { text: '日前交易策略', path: '/trading-strategy/day-ahead', icon: <TrendingUpOutlined /> },
        ],
    },
    {
        text: '风险管理',
        icon: <ShieldIcon />,
        subItems: [
            { text: '持仓合约管理', path: '/risk-management/position-contracts', icon: <FunctionsOutlined /> },
            { text: '风险敞口分析', path: '/risk-management/exposure', icon: <BarChartOutlined /> },
        ],
    },
    {
        text: '结算管理',
        icon: <PaymentIcon />,
        subItems: [
            { text: '批发侧预结算', path: '/settlement/wholesale-pre-settlement', icon: <RequestQuoteOutlined /> },
            { text: '平台账单复核', path: '/settlement/bill-review', icon: <FactCheckOutlined /> },
            { text: '零售用户结算', path: '/settlement/retail-settlement', icon: <PaymentIcon /> },
            { text: '经营利润分析', path: '/settlement/profit-analysis', icon: <ShowChartOutlined /> },
        ],
    },
    {
        text: '基础数据',
        icon: <AssessmentIcon />,
        subItems: [
            { text: '国网代购电价格', path: '/basic-data/grid-price', icon: <PriceChangeIcon /> },
            { text: '分时电价划分', path: '/basic-data/tou-definition', icon: <StyleOutlined /> },
            { text: '零售套餐管理', path: '/basic-data/retail-packages', icon: <StyleOutlined /> },
            { text: '负荷数据校验', path: '/basic-data/load-validation', icon: <VerifiedUserOutlined /> },
        ],
    },
    {
        text: '系统管理',
        icon: <SettingsIcon />,
        subItems: [
            { text: '用户与权限', path: '/system-settings/user-permissions', icon: <VpnKeyOutlined /> },
            { text: '数据接入管理', path: '/system-settings/data-access', icon: <SourceOutlined /> },
            { text: '预测模型参数', path: '/system-settings/model-parameters', icon: <ModelTrainingOutlined /> },
        ],
    },
];

export const Sidebar: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [open, setOpen] = useState<{ [key: string]: boolean }>({});

    // Hook 必须无条件调用，在使用时再判断是否为移动端
    const tabContext = useTabContext();

    const handleClick = (text: string) => {
        setOpen(prev => ({ ...prev, [text]: !prev[text] }));
    };

    // 处理菜单项点击
    const handleMenuItemClick = (path: string) => {
        if (isMobile) {
            // 移动端：使用传统的路由跳转
            navigate(path);
        } else if (tabContext) {
            // 桌面端：打开或激活页签
            const routeConfig = getRouteConfig(path);
            if (routeConfig) {
                const Component = routeConfig.component;
                tabContext.addTab({
                    key: path,
                    title: routeConfig.title,
                    path: path,
                    component: <Component />,
                });
            }
        }
    };

    // 根据当前激活的页签或路由，确定选中的菜单项
    const getActivePath = (): string => {
        if (isMobile) {
            return location.pathname;
        } else if (tabContext && tabContext.activeTabKey) {
            return tabContext.activeTabKey;
        }
        return '';
    };

    const activePath = getActivePath();

    // 自动展开包含当前激活路径的菜单
    useEffect(() => {
        if (activePath) {
            menuItems.forEach((item) => {
                if (item.subItems) {
                    const hasActiveSubItem = item.subItems.some(
                        (sub) => activePath.startsWith(sub.path)
                    );
                    if (hasActiveSubItem) {
                        setOpen((prev) => ({ ...prev, [item.text]: true }));
                    }
                }
            });
        }
    }, [activePath]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Toolbar />
            <Divider />
            <List component="nav" sx={{ flexGrow: 1, p: 1 }}>
                {menuItems.map((item) => {
                    if (item.subItems) {
                        const isOpen = open[item.text] || item.subItems.some(sub => activePath.startsWith(sub.path));
                        return (
                            <div key={item.text}>
                                <ListItemButton onClick={() => handleClick(item.text)} sx={{ borderRadius: '8px' }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                    {isOpen ? <ExpandLess /> : <ExpandMore />}
                                </ListItemButton>
                                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding>
                                        {item.subItems.map((subItem) => (
                                            <ListItemButton
                                                key={subItem.text}
                                                onClick={() => handleMenuItemClick(subItem.path)}
                                                selected={activePath === subItem.path}
                                                sx={{ pl: 4, borderRadius: '8px' }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 40 }}>{subItem.icon}</ListItemIcon>
                                                <ListItemText primary={subItem.text} />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </Collapse>
                            </div>
                        );
                    }
                    return (
                        <ListItemButton
                            key={item.text}
                            onClick={() => handleMenuItemClick(item.path || '#')}
                            selected={activePath === item.path}
                            sx={{ borderRadius: '8px' }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    );
                })}
            </List>
            <Divider />
            <List component="nav" sx={{ p: 1 }}>
                <ListItemButton onClick={handleLogout} sx={{ borderRadius: '8px' }}>
                    <ListItemIcon sx={{ minWidth: 40 }}><LogoutIcon /></ListItemIcon>
                    <ListItemText primary="退出登录" />
                </ListItemButton>
            </List>
        </Box>
    );
};