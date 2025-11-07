import React from 'react';
import { Control } from 'react-hook-form';
import { Box, Typography, Alert } from '@mui/material';
import { PackageFormData } from '../../../hooks/usePackageForm';

interface SingleComprehensiveFixedFormProps {
  control: Control<PackageFormData>;
}

/**
 * 单一综合价_固定价 表单组件（仅分时）
 *
 * 待实现：
 * - 平段基准价输入
 * - 自动浮动说明（其他时段价格自动计算）
 */
export const SingleComprehensiveFixedForm: React.FC<SingleComprehensiveFixedFormProps> = ({ control }) => {
  return (
    <Box>
      <Alert severity="info">
        <Typography variant="body2">
          【占位组件】单一综合价_固定价（仅分时） - 将在会话6中实现
        </Typography>
      </Alert>
    </Box>
  );
};
