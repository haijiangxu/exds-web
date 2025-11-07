import React from 'react';
import { Control } from 'react-hook-form';
import { Alert, Box } from '@mui/material';
import { PackageFormData } from '../../hooks/usePackageForm';

// 导入所有表单组件
import { FixedLinkedFeeForm } from './forms/FixedLinkedFeeForm';
import { FixedLinkedPriceForm } from './forms/FixedLinkedPriceForm';
import { ReferenceLinkedFeeForm } from './forms/ReferenceLinkedFeeForm';
import { ReferenceLinkedPriceForm } from './forms/ReferenceLinkedPriceForm';
import { PriceSpreadSimpleFeeForm } from './forms/PriceSpreadSimpleFeeForm';
import { PriceSpreadSimplePriceForm } from './forms/PriceSpreadSimplePriceForm';
import { PriceSpreadFormulaFeeForm } from './forms/PriceSpreadFormulaFeeForm';
import { PriceSpreadFormulaPriceForm } from './forms/PriceSpreadFormulaPriceForm';
import { SingleComprehensiveFixedForm } from './forms/SingleComprehensiveFixedForm';
import { SingleComprehensiveReferenceForm } from './forms/SingleComprehensiveReferenceForm';

interface PricingConfigFormProps {
  modelCode: string;
  control: Control<PackageFormData>;
}

/**
 * 定价配置表单路由组件
 *
 * 根据 modelCode 渲染对应的表单组件
 */
export const PricingConfigForm: React.FC<PricingConfigFormProps> = ({ modelCode, control }) => {
  // 从 modelCode 推导是否为分时套餐
  const isTimeBased = modelCode.endsWith('_time');

  // 根据 modelCode 渲染不同的表单组件
  switch (modelCode) {
    // 固定价格 + 联动价格 系列
    case 'fixed_linked_fee_non_time':
    case 'fixed_linked_fee_time':
      return <FixedLinkedFeeForm control={control} isTimeBased={isTimeBased} />;

    case 'fixed_linked_price_non_time':
    case 'fixed_linked_price_time':
      return <FixedLinkedPriceForm control={control} isTimeBased={isTimeBased} />;

    // 参考价 + 联动价格 系列
    case 'reference_linked_fee_non_time':
    case 'reference_linked_fee_time':
      return <ReferenceLinkedFeeForm control={control} isTimeBased={isTimeBased} />;

    case 'reference_linked_price_non_time':
    case 'reference_linked_price_time':
      return <ReferenceLinkedPriceForm control={control} isTimeBased={isTimeBased} />;

    // 价差分成（简单）系列
    case 'price_spread_simple_fee_non_time':
    case 'price_spread_simple_fee_time':
      return <PriceSpreadSimpleFeeForm control={control} isTimeBased={isTimeBased} />;

    case 'price_spread_simple_price_non_time':
    case 'price_spread_simple_price_time':
      return <PriceSpreadSimplePriceForm control={control} isTimeBased={isTimeBased} />;

    // 价差分成（价差公式）系列
    case 'price_spread_formula_fee_non_time':
    case 'price_spread_formula_fee_time':
      return <PriceSpreadFormulaFeeForm control={control} isTimeBased={isTimeBased} />;

    case 'price_spread_formula_price_non_time':
    case 'price_spread_formula_price_time':
      return <PriceSpreadFormulaPriceForm control={control} isTimeBased={isTimeBased} />;

    // 单一综合价（仅分时）
    case 'single_comprehensive_fixed_time':
      return <SingleComprehensiveFixedForm control={control} />;

    case 'single_comprehensive_reference_time':
      return <SingleComprehensiveReferenceForm control={control} />;

    // 未知模型
    default:
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">
            未知的定价模型代码: {modelCode}
          </Alert>
        </Box>
      );
  }
};
