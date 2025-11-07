import React from 'react';
import { Control } from 'react-hook-form';
import { Box, Typography, Alert } from '@mui/material';
import { PackageFormData } from '../../../hooks/usePackageForm';

interface PriceSpreadFormulaPriceFormProps {
  control: Control<PackageFormData>;
  isTimeBased: boolean;
}

/**
 * 价差分成（价差公式）+浮动价 表单组件
 *
 * 待实现：
 * - 3个参考价选择（reference_1/2/3_type）
 * - 分成比例输入
 * - 浮动价输入
 */
export const PriceSpreadFormulaPriceForm: React.FC<PriceSpreadFormulaPriceFormProps> = ({ control, isTimeBased }) => {
  return (
    <Box>
      <Alert severity="info">
        <Typography variant="body2">
          【占位组件】价差分成（价差公式）+浮动价 - 将在会话6中实现
        </Typography>
      </Alert>
    </Box>
  );
};
