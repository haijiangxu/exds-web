import React from 'react';
import { Control, Controller, useWatch } from 'react-hook-form';
import { RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Grid } from '@mui/material';
import { PackageFormData } from '../hooks/usePackageForm';
import { FixedLinkedForm } from './FixedLinkedForm';
import { PriceSpreadForm } from './PriceSpreadForm'; // Import PriceSpreadForm

interface PricingModeCardProps {
  control: Control<PackageFormData>;
}

export const PricingModeCard: React.FC<PricingModeCardProps> = ({ control }) => {
  const pricingMode = useWatch({ control, name: 'pricing_mode' });

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <FormControl component="fieldset">
          <FormLabel component="legend">选择定价模式</FormLabel>
          <Controller
            name="pricing_mode"
            control={control}
            render={({ field }) => (
              <RadioGroup {...field} row>
                <FormControlLabel value="fixed_linked" control={<Radio />} label="固定价格 + 联动价格 + 浮动费用" />
                <FormControlLabel value="price_spread" control={<Radio />} label="价差分成 + 浮动费用" />
              </RadioGroup>
            )}
          />
        </FormControl>
      </Grid>

      {pricingMode === 'fixed_linked' && (
        <Grid size={{ xs: 12 }}>
          <FixedLinkedForm control={control} />
        </Grid>
      )}

      {pricingMode === 'price_spread' && (
        <Grid size={{ xs: 12 }}>
          <PriceSpreadForm control={control} /> {/* Integrate PriceSpreadForm */}
        </Grid>
      )}
    </Grid>
  );
};