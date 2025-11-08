import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { Typography, Paper, TextField, Grid, Alert, AlertTitle, MenuItem, FormHelperText } from '@mui/material';
import { PackageFormData } from '../../../hooks/usePackageForm';

interface SingleComprehensiveReferenceFormProps {
  control: Control<PackageFormData>;
}

/**
 * 单一综合价_参考价 表单 (仅分时)
 */
export const SingleComprehensiveReferenceForm: React.FC<SingleComprehensiveReferenceFormProps> = ({ control }) => {

  const referenceOptions = [
    { value: 'grid_agency_price', label: '电网代理购电价格（分时）' },
    { value: 'market_monthly_avg', label: '电力市场月度交易均价（分时）' },
    { value: 'annual_longterm_time', label: '售电侧年度中长期分时交易价格' },
  ];

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>基准价格</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="pricing_config.reference_type"
                control={control}
                defaultValue=""
                rules={{ required: '参考价类型必填' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    select
                    label="参考价类型"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message || '选择计算基准'}
                  >
                    {referenceOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="pricing_config.spread_ratio"
                control={control}
                defaultValue=""
                rules={{ required: '浮动比例必填' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="平段浮动比例（%）"
                    type="number"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message || '例如: 1.5 表示上浮50%'}
                    inputProps={{ step: 0.01 }}
                  />
                )}
              />
            </Grid>
          </Grid>
          <FormHelperText sx={{mt: 1}}>
            平段结算价 = 参考价(平段) * 平段浮动比例
          </FormHelperText>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Alert severity="info">
          <AlertTitle>自动计算说明</AlertTitle>
          <Typography variant="body2">
            此模型为单一综合电价（参考价）模型，仅适用于分时套餐。<br />
            您只需输入 <strong>平段</strong> 的浮动比例，系统将基于此计算平段结算价，其他时段价格将按以下规则自动浮动计算：<br />
            <ul>
              <li><strong>峰段</strong> = 平段结算价 * 1.5</li>
              <li><strong>谷段</strong> = 平段结算价 * 0.5</li>
              <li><strong>尖峰(高段)</strong> = 平段结算价 * 1.8</li>
              <li><strong>深谷</strong> = 平段结算价 * 0.25</li>
            </ul>
            这些浮动比例是固定的，无需手动输入。
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  );
};