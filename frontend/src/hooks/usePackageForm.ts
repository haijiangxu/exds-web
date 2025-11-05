import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const customPricesSchema = z.object({
  peak: z.number().min(0),
  high: z.number().min(0),
  flat: z.number().min(331.44).max(497.16),
  valley: z.number().min(0),
  deep_valley: z.number().min(0)
});

const packageSchema = z.object({
  package_name: z.string().min(1, '套餐名称不能为空'),
  package_description: z.string().optional(),
  package_type: z.enum(['time_based', 'non_time_based']),
  pricing_mode: z.enum(['fixed_linked', 'price_spread']),
  fixed_linked_config: z.object({
    fixed_price: z.object({
      pricing_method: z.enum(['custom', 'reference']),
      custom_prices: customPricesSchema.optional(),
      reference_target: z.string().optional(), // Added for fixed price reference
    }),
    linked_price: z.object({
      ratio: z.number().min(0).max(0.2),
      target: z.enum(['day_ahead_avg', 'real_time_avg'])
    }),
    floating_fee: z.number().min(0).default(0)
  }).optional(),
  price_spread_config: z.object({ // Added price_spread_config
    reference_price: z.object({
        target: z.enum(["market_monthly_avg", "grid_agency", "wholesale_settlement"]),
    }),
    price_spread: z.object({
        agreed_spread: z.number().min(0),
        sharing_ratio: z.number().min(0).max(1), // 0 to 1 for 0-100%
    }),
    floating_fee: z.number().min(0).default(0),
  }).optional(),
  additional_terms: z.object({
    green_power: z.object({
        enabled: z.boolean(),
        monthly_env_value: z.number().optional(),
        deviation_compensation_ratio: z.number().optional(),
    }),
    price_cap: z.object({
        enabled: z.boolean(),
        reference_target: z.string().optional(), // Added for price cap reference
        non_peak_markup: z.number().optional(),
        peak_markup: z.number().optional(),
    }),
  }).optional(),
});

export type PackageFormData = z.infer<typeof packageSchema>;

export const usePackageForm = (defaultValues?: any) => {
  return useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
    defaultValues: defaultValues || {
      package_name: '',
      package_type: 'time_based',
      pricing_mode: 'fixed_linked',
      fixed_linked_config: {
        fixed_price: {
          pricing_method: 'custom',
          custom_prices: {
            peak: 0,
            high: 0,
            flat: 331.44,
            valley: 0,
            deep_valley: 0
          },
          reference_target: 'grid_agency_price' // Default for reference
        },
        linked_price: {
          ratio: 0.15,
          target: 'day_ahead_avg'
        },
        floating_fee: 0
      },
      price_spread_config: { // Default for price_spread_config
        reference_price: {
            target: 'market_monthly_avg',
        },
        price_spread: {
            agreed_spread: 0,
            sharing_ratio: 0,
        },
        floating_fee: 0,
      },
      additional_terms: {
        green_power: { enabled: false, monthly_env_value: 0, deviation_compensation_ratio: 0 },
        price_cap: { enabled: false, reference_target: 'grid_agency_price', non_peak_markup: 5, peak_markup: 10 },
      }
    }
  });
};