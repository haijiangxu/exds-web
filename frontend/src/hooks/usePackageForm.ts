import { useForm } from 'react-hook-form';

// 绿电配置（保留）
export interface GreenPowerConfig {
  monthly_env_value: number;
  deviation_compensation_ratio: number;
}

// 套餐表单数据（重构后）
export interface PackageFormData {
  package_name: string;
  package_description?: string;
  package_type: 'time_based' | 'non_time_based';
  is_green_power: boolean;
  model_code: string; // 定价模型代码
  pricing_config: Record<string, any>; // 统一的定价配置字典
  green_power_config?: GreenPowerConfig;
}

export const usePackageForm = (defaultValues?: any) => {
  return useForm<PackageFormData>({
    defaultValues: defaultValues || {
      package_name: '',
      package_type: 'time_based',
      is_green_power: false,
      model_code: '', // 默认未选择模型
      pricing_config: {}, // 默认空配置
      green_power_config: {
        monthly_env_value: 0,
        deviation_compensation_ratio: 0
      }
    }
  });
};
