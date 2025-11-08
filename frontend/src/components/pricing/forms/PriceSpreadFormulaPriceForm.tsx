import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { Typography, Paper, TextField, Grid, MenuItem, FormHelperText } from '@mui/material';
import { PackageFormData } from '../../../hooks/usePackageForm';

interface PriceSpreadFormulaPriceFormProps {
  control: Control<PackageFormData>;
  isTimeBased: boolean;
}

/**
 * 价差分成（价差公式）+浮动价 表单
 */
export const PriceSpreadFormulaPriceForm: React.FC<PriceSpreadFormulaPriceFormProps> = ({ control, isTimeBased }) => {
  const referenceOptions = isTimeBased ? [
    { value: 'day_ahead_avg', label: '日前市场均价（分时）' },
    { value: 'real_time_avg', label: '实时市场均价（分时）' },
    { value: 'market_monthly_avg', label: '电力市场月度交易均价（分时）' },
    { value: 'grid_agency_price', label: '电网代理购电价格（分时）' },
  ] : [
    { value: 'day_ahead_avg', label: '日前市场均价' },
    { value: 'real_time_avg', label: '实时市场均价' },
    { value: 'market_monthly_avg', label: '电力市场月度交易均价' },
    { value: 'grid_agency_price', label: '电网代理购电价格' },
  ];

  return (
    <Grid container spacing={2}>
      {/* 价差分成 */}
      <Grid size={{ xs: 12 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>价差分成</Typography>
          <FormHelperText sx={{ mb: 2 }}>
            价差式 = 参考价2 - 参考价3
          </FormHelperText>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="pricing_config.reference_1_type"
                control={control}
                defaultValue=""
                rules={{ required: '参考价1必填' }}
                render={({ field, fieldState }) => (
                  <TextField {...field} select label="参考价 1" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message}>
                    {referenceOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="pricing_config.reference_2_type"
                control={control}
                defaultValue=""
                rules={{ required: '参考价2必填' }}
                render={({ field, fieldState }) => (
                  <TextField {...field} select label="参考价 2" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message}>
                    {referenceOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="pricing_config.reference_3_type"
                control={control}
                defaultValue=""
                rules={{ required: '参考价3必填' }}
                render={({ field, fieldState }) => (
                  <TextField {...field} select label="参考价 3" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message}>
                    {referenceOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
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