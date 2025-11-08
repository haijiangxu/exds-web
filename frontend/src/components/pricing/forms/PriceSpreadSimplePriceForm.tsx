import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { Typography, Paper, TextField, Grid, MenuItem, FormHelperText } from '@mui/material';
import { PackageFormData } from '../../../hooks/usePackageForm';

interface PriceSpreadSimplePriceFormProps {
  control: Control<PackageFormData>;
  isTimeBased: boolean;
}

/**
 * 价差分成+浮动价 表单
 */
export const PriceSpreadSimplePriceForm: React.FC<PriceSpreadSimplePriceFormProps> = ({ control, isTimeBased }) => {
  const referenceTypeOptions = isTimeBased ? [
    { value: 'day_ahead_avg', label: '日前市场均价（分时）' },
    { value: 'real_time_avg', label: '实时市场均价（分时）' },
  ] : [
    { value: 'day_ahead_avg', label: '日前市场均价' },
    { value: 'real_time_avg', label: '实时市场均价' },
  ];

  return (
    <Grid container spacing={2}>
      {/* 价差分成 */}
      <Grid size={{ xs: 12 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>价差分成</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
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
                    helperText={fieldState.error?.message || '作为计算价差的基准'}
                  >
                    {referenceTypeOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="pricing_config.agreed_price_spread"
                control={control}
                defaultValue=""
                rules={{ required: '约定价差必填' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="约定价差 (元/kWh)"
                    type="number"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message || '售电公司与用户约定的参考价差'}
                    inputProps={{ step: 0.0001 }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="pricing_config.sharing_ratio"
                control={control}
                defaultValue=""
                rules={{
                  required: '分成比例必填',
                  min: { value: 0, message: '不低于0' },
                  max: { value: 100, message: '不高于100' }
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="分成比例（%）"
                    type="number"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message || '用户侧获取的价差收益分成比例'}
                    inputProps={{ step: 1 }}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* 浮动价 */}
      <Grid size={{ xs: 12 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>浮动价</Typography>
          <Controller
            name="pricing_config.floating_price"
            control={control}
            defaultValue=""
            rules={{ required: '浮动价必填' }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="浮动价 (元/kWh)"
                type="number"
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message || '固定单价，直接附加到结算价格中'}
                inputProps={{ step: 0.0001 }}
              />
            )}
          />
          <FormHelperText sx={{ mt: 1 }}>
            此价格将附加在价差分成计算后的价格之上。
          </FormHelperText>
        </Paper>
      </Grid>
    </Grid>
  );
};