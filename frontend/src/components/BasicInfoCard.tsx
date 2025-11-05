import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { TextField, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Grid } from '@mui/material';
import { PackageFormData } from '../hooks/usePackageForm';

interface BasicInfoCardProps {
  control: Control<PackageFormData>;
}

export const BasicInfoCard: React.FC<BasicInfoCardProps> = ({ control }) => {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Controller
          name="package_name"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              label="套餐名称"
              fullWidth
              error={!!error}
              helperText={error?.message}
            />
          )}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <FormControl component="fieldset">
          <FormLabel component="legend">套餐类型</FormLabel>
          <Controller
            name="package_type"
            control={control}
            render={({ field }) => (
              <RadioGroup {...field} row>
                <FormControlLabel value="time_based" control={<Radio />} label="分时段零售套餐" />
                <FormControlLabel value="non_time_based" control={<Radio />} label="不分时段零售套餐" />
              </RadioGroup>
            )}
          />
        </FormControl>
      </Grid>
    </Grid>
  );
};