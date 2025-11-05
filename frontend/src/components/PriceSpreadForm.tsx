import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { TextField, FormControl, FormLabel, Grid, Typography, Paper, Select, MenuItem, InputLabel } from '@mui/material';
import { PackageFormData } from '../hooks/usePackageForm';

interface PriceSpreadFormProps {
  control: Control<PackageFormData>;
}

export const PriceSpreadForm: React.FC<PriceSpreadFormProps> = ({ control }) => {
  return (
    <Grid container spacing={2}> {/* Outer Grid container for the whole form */}
      <Grid size={{ xs: 12 }}> {/* Reference Price Section */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>参考价 (Reference Price)</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth variant="standard">
                <InputLabel>参考标的</InputLabel>
                <Controller
                  name="price_spread_config.reference_price.target"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} label="参考标的">
                      <MenuItem value="market_monthly_avg">电力市场月度交易均价</MenuItem>
                      <MenuItem value="grid_agency">电网代理购电价格</MenuItem>
                      <MenuItem value="wholesale_settlement">批发侧结算均价</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12 }}> {/* Price-spread Sharing Section */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>价差分成 (Price-spread Sharing)</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="price_spread_config.price_spread.agreed_spread"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="约定价差 (元/MWh)"
                    fullWidth
                    variant="standard"
                    inputProps={{ step: "0.01" }}
                    helperText="提示: 可为固定值或参考价之差"
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="price_spread_config.price_spread.sharing_ratio"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="分成比例 (k) (%)"
                    fullWidth
                    variant="standard"
                    inputProps={{ step: "0.01", min: "0", max: "1" }}
                    helperText="提示: 0%~100%"
                  />
                )}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12 }}> {/* Floating Fee Section */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>浮动费用 (Floating Fee)</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Controller
                name="price_spread_config.floating_fee"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="浮动费用 (元)"
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