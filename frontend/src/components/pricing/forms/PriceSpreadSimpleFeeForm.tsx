import React from 'react';
import { Control } from 'react-hook-form';
import { Box, Typography, Alert } from '@mui/material';
import { PackageFormData } from '../../../hooks/usePackageForm';

interface PriceSpreadSimpleFeeFormProps {
  control: Control<PackageFormData>;
  isTimeBased: boolean;
}

/**
 * 价差分成+浮动费用 表单组件
 *
 * 待实现：
 * - 参考价选择
 * - 约定价差输入
 * - 分成比例输入
 * - 浮动费用输入
 */
export const PriceSpreadSimpleFeeForm: React.FC<PriceSpreadSimpleFeeFormProps> = ({ control, isTimeBased }) => {
  return (
    <Box>
      <Alert severity="info">
        <Typography variant="body2">
          【占位组件】价差分成+浮动费用 - 将在会话6中实现
        </Typography>
      </Alert>
    </Box>
  );
};
