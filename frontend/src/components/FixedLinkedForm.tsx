import React from 'react';
import { Control, Controller, useWatch } from 'react-hook-form';
import { TextField, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Grid, Typography, Paper } from '@mui/material';
import { PackageFormData } from '../hooks/usePackageForm';
import { PriceRatioValidator } from './PriceRatioValidator';

interface FixedLinkedFormProps {
  control: Control<PackageFormData>;
}

import { PriceRatioValidator } from './PriceRatioValidator';

export const FixedLinkedForm: React.FC<FixedLinkedFormProps> = ({ control }) => {
  const packageType = useWatch({ control, name: 'package_type' });
  const pricingMethod = useWatch({ control, name: 'fixed_linked_config.fixed_price.pricing_method' });
  const customPrices = useWatch({ control, name: 'fixed_linked_config.fixed_price.custom_prices' });

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>固定价格 (Fixed Price)</Typography>
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <FormControl component="fieldset">
                <FormLabel component="legend">定价方式</FormLabel>
                <Controller
                    name="fixed_linked_config.fixed_price.pricing_method"
                    control={control}
                    render={({ field }) => (
                    <RadioGroup {...field} row>
                        <FormControlLabel value="custom" control={<Radio />} label="自定义价格" />
                        <FormControlLabel value="reference" control={<Radio />} label="按参考价" />
                    </RadioGroup>
                    )}
                />
                </FormControl>
            </Grid>

            {packageType === 'time_based' && pricingMethod === 'custom' && (
                <>
                    <Grid item xs={6} sm={4}>
                        <Controller
                        name="fixed_linked_config.fixed_price.custom_prices.peak"
                        control={control}
                        render={({ field }) => <TextField {...field} type="number" label="尖峰时段价格" fullWidth variant="standard" />}
                        />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <Controller
                        name="fixed_linked_config.fixed_price.custom_prices.high"
                        control={control}
                        render={({ field }) => <TextField {...field} type="number" label="峰时段价格" fullWidth variant="standard" />}
                        />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <Controller
                        name="fixed_linked_config.fixed_price.custom_prices.flat"
                        control={control}
                        render={({ field }) => <TextField {...field} type="number" label="平时段价格" fullWidth variant="standard" />}
                        />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <Controller
                        name="fixed_linked_config.fixed_price.custom_prices.valley"
                        control={control}
                        render={({ field }) => <TextField {...field} type="number" label="谷时段价格" fullWidth variant="standard" />}
                        />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <Controller
                        name="fixed_linked_config.fixed_price.custom_prices.deep_valley"
                        control={control}
                        render={({ field }) => <TextField {...field} type="number" label="深谷时段价格" fullWidth variant="standard" />}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        {customPrices && <PriceRatioValidator customPrices={customPrices} />}
                    </Grid>
                </>
            )}
        </Grid>
    </Paper>
  );
};