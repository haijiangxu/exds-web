import React from 'react';
import { Control, Controller, useWatch } from 'react-hook-form';
import { TextField, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Grid, Typography, Paper, Select, MenuItem, InputLabel } from '@mui/material';
import { PackageFormData } from '../hooks/usePackageForm';
import { PriceRatioValidator } from './PriceRatioValidator';

interface FixedLinkedFormProps {
  control: Control<PackageFormData>;
}

export const FixedLinkedForm: React.FC<FixedLinkedFormProps> = ({ control }) => {
  const packageType = useWatch({ control, name: 'package_type' });
  const pricingMethod = useWatch({ control, name: 'fixed_linked_config.fixed_price.pricing_method' });
  const customPrices = useWatch({ control, name: 'fixed_linked_config.fixed_price.custom_prices' });

  return (
    <Grid container spacing={2}> {/* Outer Grid container for the whole form */}
      <Grid size={{ xs: 12 }}> {/* Fixed Price Section */}
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>固定价格 (Fixed Price)</Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
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
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <Controller
                            name="fixed_linked_config.fixed_price.custom_prices.peak"
                            control={control}
                            render={({ field }) => <TextField {...field} type="number" label="尖峰时段价格" fullWidth variant="standard" />}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <Controller
                            name="fixed_linked_config.fixed_price.custom_prices.high"
                            control={control}
                            render={({ field }) => <TextField {...field} type="number" label="峰时段价格" fullWidth variant="standard" />}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <Controller
                            name="fixed_linked_config.fixed_price.custom_prices.flat"
                            control={control}
                            render={({ field }) => <TextField {...field} type="number" label="平时段价格" fullWidth variant="standard" />}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <Controller
                            name="fixed_linked_config.fixed_price.custom_prices.valley"
                            control={control}
                            render={({ field }) => <TextField {...field} type="number" label="谷时段价格" fullWidth variant="standard" />}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <Controller
                            name="fixed_linked_config.fixed_price.custom_prices.deep_valley"
                            control={control}
                            render={({ field }) => <TextField {...field} type="number" label="深谷时段价格" fullWidth variant="standard" />}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            {customPrices && <PriceRatioValidator customPrices={customPrices} />}
                        </Grid>
                    </>
                )}
                {/* Reference pricing method for fixed price */}
                {pricingMethod === 'reference' && (
                    <Grid size={{ xs: 12 }}>
                        <FormControl fullWidth variant="standard">
                            <InputLabel>参考标的</InputLabel>
                            <Controller
                                name="fixed_linked_config.fixed_price.reference_target"
                                control={control}
                                render={({ field }) => (
                                    <Select {...field} label="参考标的">
                                        <MenuItem value="grid_agency_price">电网代理购电价格(分时)</MenuItem>
                                        <MenuItem value="market_monthly_avg">电力市场月度交易均价(分时)</MenuItem>
                                    </Select>
                                )}
                            />
                        </FormControl>
                    </Grid>
                )}
            </Grid>
        </Paper>
      </Grid>

      {/* Linked Price Section */}
      <Grid size={{ xs: 12 }}> 
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>联动价格 (Linked Price)</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="fixed_linked_config.linked_price.ratio"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="联动比例 (α) (%)"
                    fullWidth
                    variant="standard"
                    inputProps={{ step: "0.01", min: "0", max: "0.2" }} 
                    helperText="提示: 10%~20%，特定用户可为0"
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth variant="standard">
                <InputLabel>联动标的</InputLabel>
                <Controller
                  name="fixed_linked_config.linked_price.target"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} label="联动标的">
                      <MenuItem value="day_ahead_avg">日前市场均价(分时)</MenuItem>
                      <MenuItem value="real_time_avg">实时市场均价(分时)</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Floating Fee Section */}
      <Grid size={{ xs: 12 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>浮动费用 (Floating Fee)</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Controller
                name="fixed_linked_config.floating_fee"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="浮动费用 (元/kWh)"
                    fullWidth
                    variant="standard"
                    inputProps={{ step: "0.01", min: "0" }}
                    helperText="提示: 可选项，大于等于0"
                  />
                )}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
};