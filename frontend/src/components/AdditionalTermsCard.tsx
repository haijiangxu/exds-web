import React from 'react';
import { Control, Controller, useWatch } from 'react-hook-form';
import { Switch, FormControlLabel, Grid, Paper, Typography, TextField } from '@mui/material';
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
      <Grid item xs={12} md={6}>
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
            </Box>
          )}
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
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
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};