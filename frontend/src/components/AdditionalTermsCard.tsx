import React from 'react';
import { Control, Controller, useWatch } from 'react-hook-form';
import { Switch, FormControlLabel, Grid, Paper, Typography, TextField, Box, Select, MenuItem, FormControl, InputLabel, FormHelperText } from '@mui/material';
import { PackageFormData } from '../hooks/usePackageForm';

interface AdditionalTermsCardProps {
  control: Control<PackageFormData>;
}

export const AdditionalTermsCard: React.FC<AdditionalTermsCardProps> = ({ control }) => {
  const packageType = useWatch({ control, name: 'package_type' });
  const greenPowerEnabled = useWatch({ control, name: 'additional_terms.green_power.enabled' });
  const priceCapEnabled = useWatch({ control, name: 'additional_terms.price_cap.enabled' });

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
          <FormControlLabel
            control={
              <Controller
                name="additional_terms.green_power.enabled"
                control={control}
                render={({ field }) => <Switch {...field} checked={field.value} />}
              />
            }
            label="绿色电力套餐"
            disabled={packageType !== 'time_based'}
          />
          {greenPowerEnabled && (
            <Box sx={{ mt: 2 }}>
              <Controller
                name="additional_terms.green_power.monthly_env_value"
                control={control}
                render={({ field }) => <TextField {...field} type="number" label="月度绿色电力环境价值 (元/MWh)" fullWidth margin="dense" />}
              />
              <Controller
                name="additional_terms.green_power.deviation_compensation_ratio"
                control={control}
                render={({ field }) => <TextField {...field} type="number" label="偏差补偿比例 (%)" fullWidth margin="dense" />}
              />
              <FormHelperText sx={{ mt: 1 }}>
                “双方用电量与约定电量偏差时，将按此比例进行补偿”。
              </FormHelperText>
            </Box>
          )}
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
          <FormControlLabel
            control={
              <Controller
                name="additional_terms.price_cap.enabled"
                control={control}
                render={({ field }) => <Switch {...field} checked={field.value} />}
              />
            }
            label="封顶价格条款"
          />
          {priceCapEnabled && (
            <Box sx={{ mt: 2 }}>
                <FormControl fullWidth margin="dense">
                    <InputLabel>参考价格标的</InputLabel>
                    <Controller
                        name="additional_terms.price_cap.reference_target"
                        control={control}
                        defaultValue="grid_agency_monthly_avg"
                        render={({ field }) => (
                            <Select {...field} label="参考价格标的">
                                <MenuItem value="grid_agency_monthly_avg">电网代理购电发布的电力市场当月平均上网电价</MenuItem>
                                {/* Add other options if available */}
                            </Select>
                        )}
                    />
                </FormControl>
              <Controller
                name="additional_terms.price_cap.non_peak_markup"
                control={control}
                render={({ field }) => <TextField {...field} type="number" label="非尖峰月份上浮 (%)" fullWidth margin="dense" />}
              />
              <Controller
                name="additional_terms.price_cap.peak_markup"
                control={control}
                render={({ field }) => <TextField {...field} type="number" label="尖峰月份上浮 (%)" fullWidth margin="dense" />}
              />
              <FormHelperText sx={{ mt: 1 }}>
                “结算时，若套餐结算价高于封顶价，将按封顶价结算”。
              </FormHelperText>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};