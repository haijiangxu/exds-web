import React from 'react';
import { LoadAnalysisPage } from '../pages/LoadAnalysisPage';
import { MarketPriceAnalysisPage } from '../pages/MarketPriceAnalysisPage';
import PlaceholderPage from '../components/PlaceholderPage';
import GridAgencyPricePage from '../pages/GridAgencyPricePage';
import RetailPackagePage from '../pages/RetailPackagePage';
import { CustomerManagementPage } from '../pages/CustomerManagementPage';

// 路由配置接口
export interface RouteConfig {
    path: string;
    title: string;
    component: React.ComponentType;
}

// 路由配置列表
export const routeConfigs: RouteConfig[] = [
    { path: '/dashboard', title: '交易总览', component: PlaceholderPage },

    // 客户管理
    { path: '/customer/profiles', title: '客户档案管理', component: CustomerManagementPage },
    { path: '/customer/retail-contracts', title: '零售合同管理', component: PlaceholderPage },
    { path: '/customer/load-analysis', title: '客户负荷分析', component: LoadAnalysisPage },
    { path: '/customer/cluster-analysis', title: '客户聚类分析', component: PlaceholderPage },

    // 负荷预测
    { path: '/load-forecast/overall-analysis', title: '总体负荷分析', component: LoadAnalysisPage },
    { path: '/load-forecast/short-term', title: '短期负荷预测', component: PlaceholderPage },
    { path: '/load-forecast/accuracy-analysis', title: '预测精度分析', component: PlaceholderPage },
    { path: '/load-forecast/long-term', title: '中长期负荷预测', component: PlaceholderPage },

    // 价格分析
    { path: '/price-analysis/spot-market', title: '现货价格分析', component: MarketPriceAnalysisPage },
    { path: '/price-analysis/mid-long-term', title: '中长期价格分析', component: PlaceholderPage },
    { path: '/price-analysis/comparison', title: '价格对比分析', component: PlaceholderPage },

    // 价格预测
    { path: '/price-forecast/baseline-data', title: '预测基础数据', component: PlaceholderPage },
    { path: '/price-forecast/d-2', title: 'D-2价格预测', component: PlaceholderPage },
    { path: '/price-forecast/day-ahead', title: '日前价格预测', component: PlaceholderPage },
    { path: '/price-forecast/monthly', title: '月度价格预测', component: PlaceholderPage },

    // 交易决策
    { path: '/trading-strategy/contract-curve', title: '合同曲线生成', component: PlaceholderPage },
    { path: '/trading-strategy/monthly', title: '月度交易策略', component: PlaceholderPage },
    { path: '/trading-strategy/d-2', title: 'D-2交易策略', component: PlaceholderPage },
    { path: '/trading-strategy/day-ahead', title: '日前交易策略', component: PlaceholderPage },

    // 风险管理
    { path: '/risk-management/position-contracts', title: '持仓合约管理', component: PlaceholderPage },
    { path: '/risk-management/exposure', title: '风险敞口分析', component: PlaceholderPage },

    // 结算管理
    { path: '/settlement/wholesale-pre-settlement', title: '批发侧预结算', component: PlaceholderPage },
    { path: '/settlement/bill-review', title: '平台账单复核', component: PlaceholderPage },
    { path: '/settlement/retail-settlement', title: '零售用户结算', component: PlaceholderPage },
    { path: '/settlement/profit-analysis', title: '经营利润分析', component: PlaceholderPage },

    // 基础数据
    { path: '/basic-data/grid-price', title: '国网代购电价格', component: GridAgencyPricePage },
    { path: '/basic-data/tou-definition', title: '分时电价划分', component: PlaceholderPage },
    { path: '/basic-data/retail-packages', title: '零售套餐管理', component: RetailPackagePage },
    { path: '/basic-data/load-validation', title: '负荷数据校验', component: PlaceholderPage },

    // 系统管理
    { path: '/system-settings/user-permissions', title: '用户与权限', component: PlaceholderPage },
    { path: '/system-settings/data-access', title: '数据接入管理', component: PlaceholderPage },
    { path: '/system-settings/model-parameters', title: '预测模型参数', component: PlaceholderPage },
];

// 根据路径获取路由配置
export const getRouteConfig = (path: string): RouteConfig | undefined => {
    return routeConfigs.find(config => config.path === path);
};
