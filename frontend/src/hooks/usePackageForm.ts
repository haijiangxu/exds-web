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
  package_type: z.enum(['time_based', 'non_time_based']),
  pricing_mode: z.enum(['fixed_linked', 'price_spread']),
  fixed_linked_config: z.object({
    fixed_price: z.object({
      pricing_method: z.enum(['custom', 'reference']),
      custom_prices: customPricesSchema.optional()
    }),
    linked_price: z.object({
      ratio: z.number().min(0).max(0.2),
      target: z.enum(['day_ahead_avg', 'real_time_avg'])
    }),
    floating_fee: z.number().min(0).default(0)
  }).optional(),
  additional_terms: z.object({
    green_power: z.object({
        enabled: z.boolean(),
        monthly_env_value: z.number().optional(),
        deviation_compensation_ratio: z.number().optional(),
    }),
    price_cap: z.object({
        enabled: z.boolean(),
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
          }
        },
        linked_price: {
          ratio: 0.15,
          target: 'day_ahead_avg'
        },
        floating_fee: 0
      },
      additional_terms: {
        green_power: { enabled: false },
        price_cap: { enabled: false },
      }
    }
  });
};