import React from 'react';
import { Paper, Typography, Grid, Box, Chip, Alert, Divider } from '@mui/material';
import { PricingModel } from '../../../types/pricing';

interface PricingDetailsProps {
  model: PricingModel | undefined;
  pricingConfig: Record<string, any>;
  packageType: 'time_based' | 'non_time_based';
}

// 参考价类型映射
const getReferenceTypeLabel = (value: string, isTimeBased: boolean): string => {
  const map: Record<string, { timeBased: string; nonTimeBased: string }> = {
    'day_ahead_avg': {
      timeBased: '日前市场均价（分时）',
      nonTimeBased: '日前市场均价'
    },
    'real_time_avg': {
      timeBased: '实时市场均价（分时）',
      nonTimeBased: '实时市场均价'
    },
    'market_monthly_avg': {
      timeBased: '电力市场月度交易均价(当月平均上网电价)（分时）',
      nonTimeBased: '电力市场月度交易均价(当月平均上网电价)'
    },
    'grid_agency_price': {
      timeBased: '电网代理购电价格（分时）',
      nonTimeBased: '电网代理购电价格'
    },
    'ceiling_price': {
      timeBased: '上限价',
      nonTimeBased: '上限价'
    },
    'annual_longterm_time': {
      timeBased: '售电侧年度中长期分时交易价格',
      nonTimeBased: '售电侧年度中长期分时交易价格'
    },
    'monthly_settlement_avg': {
      timeBased: '售电侧月度结算加权价（不分时）',
      nonTimeBased: '售电侧月度结算加权价（不分时）'
    },
    'longterm_time': {
      timeBased: '售电侧中长期分时交易价格',
      nonTimeBased: '售电侧中长期分时交易价格'
    }
  };

  if (map[value]) {
    return isTimeBased ? map[value].timeBased : map[value].nonTimeBased;
  }
  return value; // 如果找不到映射，返回原值
};

// 联动标的映射
const getLinkedTargetLabel = (value: string, isTimeBased: boolean): string => {
  const map: Record<string, { timeBased: string; nonTimeBased: string }> = {
    'day_ahead_avg': {
      timeBased: '日前市场均价（分时）',
      nonTimeBased: '日前市场均价'
    },
    'real_time_avg': {
      timeBased: '实时市场均价（分时）',
      nonTimeBased: '实时市场均价'
    }
  };

  if (map[value]) {
    return isTimeBased ? map[value].timeBased : map[value].nonTimeBased;
  }
  return value;
};

// 格式化数字
const formatNumber = (value: any, decimals: number = 5): string => {
  if (value === undefined || value === null || value === '') return '';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toFixed(decimals);
};

// 辅助函数，用于渲染单个配置项
const renderConfigItem = (label: string, value: any, unit: string = '') => {
    if (value === undefined || value === null || value === '') return null;
    return (
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="body1">{String(value)}{unit ? ' ' + unit : ''}</Typography>
        </Grid>
    );
};

export const PricingDetails: React.FC<PricingDetailsProps> = ({ model, pricingConfig, packageType }) => {
    if (!model) {
        return (
            <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
                <Alert severity="warning">未选择定价模型</Alert>
            </Paper>
        );
    }

    const isTimeBased = packageType === 'time_based';

    const renderParams = () => {
        const { pricing_mode } = model;

        // 固定价格部分
        const renderFixedPrices = () => (
            <>
                {isTimeBased ? (
                    <>
                        {renderConfigItem('尖峰价格', formatNumber(pricingConfig.fixed_price_peak), '元/kWh')}
                        {renderConfigItem('峰价格', formatNumber(pricingConfig.fixed_price_high), '元/kWh')}
                        {renderConfigItem('平价格', formatNumber(pricingConfig.fixed_price_flat), '元/kWh')}
                        {renderConfigItem('谷价格', formatNumber(pricingConfig.fixed_price_valley), '元/kWh')}
                        {renderConfigItem('深谷价格', formatNumber(pricingConfig.fixed_price_deep_valley), '元/kWh')}
                    </>
                ) : (
                    <>
                        {renderConfigItem('固定价格', formatNumber(pricingConfig.fixed_price_value), '元/kWh')}
                    </>
                )}
            </>
        );

        // 联动价格部分
        const renderLinkedConfig = () => (
            <>
                {renderConfigItem('联动电量比例', formatNumber(pricingConfig.linked_ratio, 1), '%')}
                {pricingConfig.linked_target && renderConfigItem(
                    '联动标的',
                    getLinkedTargetLabel(pricingConfig.linked_target, isTimeBased)
                )}
            </>
        );

        // 参考价部分
        const renderReferenceConfig = () => (
            <>
                {pricingConfig.reference_type && renderConfigItem(
                    '参考价类型',
                    getReferenceTypeLabel(pricingConfig.reference_type, isTimeBased)
                )}
            </>
        );

        // 价差分成部分
        const renderPriceSpreadConfig = () => (
            <>
                {/* 价差简单模式需要显示参考价 */}
                {pricing_mode === 'price_spread_simple' && pricingConfig.reference_type && renderConfigItem(
                    '参考价类型',
                    getReferenceTypeLabel(pricingConfig.reference_type, isTimeBased)
                )}
                {/* 约定价差仅在简单模式显示 */}
                {pricing_mode === 'price_spread_simple' && renderConfigItem('约定价差', formatNumber(pricingConfig.agreed_price_spread), '元/kWh')}
                {renderConfigItem('分成比例', formatNumber(pricingConfig.sharing_ratio, 1), '%')}
                {pricing_mode === 'price_spread_formula' && (
                    <>
                        {pricingConfig.reference_1_type && renderConfigItem(
                            '参考价1',
                            getReferenceTypeLabel(pricingConfig.reference_1_type, isTimeBased)
                        )}
                        {pricingConfig.reference_2_type && renderConfigItem(
                            '参考价2',
                            getReferenceTypeLabel(pricingConfig.reference_2_type, isTimeBased)
                        )}
                        {pricingConfig.reference_3_type && renderConfigItem(
                            '参考价3',
                            getReferenceTypeLabel(pricingConfig.reference_3_type, isTimeBased)
                        )}
                    </>
                )}
            </>
        );

        // 浮动部分
        const renderFloating = () => {
            if (!model.floating_type) return null;

            if (model.floating_type === 'price') {
                // 浮动价（不分时段）
                return renderConfigItem('浮动价', formatNumber(pricingConfig.floating_price), '元/kWh');
            } else if (model.floating_type === 'fee') {
                // 浮动费用（不分时段）
                return renderConfigItem('浮动费用', formatNumber(pricingConfig.floating_fee), '元/kWh');
            }
            return null;
        };

        switch (pricing_mode) {
            case 'fixed_linked':
                return <>{renderFixedPrices()}{renderLinkedConfig()}{renderFloating()}</>;
            case 'reference_linked':
                return <>{renderReferenceConfig()}{renderLinkedConfig()}{renderFloating()}</>;
            case 'price_spread_simple':
            case 'price_spread_formula':
                return <>{renderPriceSpreadConfig()}{renderFloating()}</>;
            case 'single_comprehensive':
                return <>{renderFixedPrices()}</>;
            default:
                return (
                    <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                            {JSON.stringify(pricingConfig, null, 2)}
                        </Typography>
                    </Grid>
                );
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
            <Typography variant="h6" gutterBottom>定价配置</Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={model.display_name} color="primary" />
                <Chip label={isTimeBased ? '分时' : '不分时'} size="small" />
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" component="div" gutterBottom>计算公式</Typography>
                <Typography
                    variant="body2"
                    component="div"
                    dangerouslySetInnerHTML={{ __html: model.formula }}
                    sx={{
                        '& br': { display: 'block', content: '""', marginTop: '0.5em' }
                    }}
                />
            </Alert>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>详细参数</Typography>
            <Grid container spacing={2}>
                {renderParams()}
            </Grid>

            {model.description && (
                <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom>模型说明</Typography>
                    <Typography variant="body2" component="div" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: model.description }} />
                </>
            )}
        </Paper>
    );
};
