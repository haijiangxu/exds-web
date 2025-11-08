import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { Typography, Paper, TextField, Grid, Alert, AlertTitle } from '@mui/material';
import { PackageFormData } from '../../../hooks/usePackageForm';

interface SingleComprehensiveFixedFormProps {
  control: Control<PackageFormData>;
}

/**
 * 单一综合价_固定价 表单 (仅分时)
 */
export const SingleComprehensiveFixedForm: React.FC<SingleComprehensiveFixedFormProps> = ({ control }) => {

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>基准价格</Typography>
          <Controller
            name="pricing_config.flat_price"
            control={control}
            defaultValue=""
            rules={{ required: '平段基准价必填' }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="平段基准价 (元/kWh)"
                type="number"
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message || '输入平段价格，其他时段价格将自动计算'}
                inputProps={{ step: 0.0001 }}
              />
            )}
          />
        </Paper>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Alert severity="info">
          <AlertTitle>自动计算说明</AlertTitle>
          <Typography variant="body2">
            此模型为单一综合电价（固定价）模型，仅适用于分时套餐。<br />
            您只需输入 <strong>平段</strong> 的基准价格，其他时段价格将按以下规则自动浮动计算：<br />
            <ul>
              <li><strong>峰段</strong> = 平段价格 * 1.5</li>
              <li><strong>谷段</strong> = 平段价格 * 0.5</li>
              <li><strong>尖峰(高段)</strong> = 平段价格 * 1.8</li>
              <li><strong>深谷</strong> = 平段价格 * 0.25</li>
            </ul>
            这些浮动比例是固定的，无需手动输入。
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  );
};