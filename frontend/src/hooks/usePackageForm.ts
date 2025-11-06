import { useForm } from 'react-hook-form';


export interface CustomPrices {
  peak: number;
  high: number;
  flat: number;
  valley: number;
  deep_valley: number;
  all_day?: number;
}

export interface FixedPriceConfig {
  pricing_method: 'custom' | 'reference';
  custom_prices?: CustomPrices;
  reference_target?: 'grid_agency_price' | 'market_monthly_avg';
}

export interface LinkedPriceConfig {
  ratio: number;
  target: 'day_ahead_avg' | 'real_time_avg';
}

export interface FixedLinkedConfig {
  fixed_price: FixedPriceConfig;
  linked_price: LinkedPriceConfig;
  floating_fee: number;
}

export interface PriceSpreadReferencePrice {
  target: 'market_monthly_avg' | 'grid_agency' | 'wholesale_settlement';
  value?: number;
}

export interface PriceSpreadSharing {
  agreed_spread: number;
  sharing_ratio: number;
}

export interface PriceSpreadConfig {
  reference_price: PriceSpreadReferencePrice;
  price_spread: PriceSpreadSharing;
  floating_fee: number;
}

export interface GreenPowerTerm {
  enabled: boolean;
  monthly_env_value?: number;
  deviation_compensation_ratio?: number;
}

export interface PriceCapTerm {
  enabled: boolean;
  reference_target?: string;
  non_peak_markup?: number;
  peak_markup?: number;
}

export interface AdditionalTerms {
  green_power: GreenPowerTerm;
  price_cap: PriceCapTerm;
}

export interface PackageFormData {
  package_name: string;
  package_description?: string;
  package_type: 'time_based' | 'non_time_based';
  pricing_mode: 'fixed_linked' | 'price_spread';
  fixed_linked_config?: FixedLinkedConfig;
  price_spread_config?: PriceSpreadConfig;
  additional_terms?: AdditionalTerms;
}

export const usePackageForm = (defaultValues?: any) => {
  return useForm<PackageFormData>({
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
            deep_valley: 0,
            all_day: 0
          },
          reference_target: 'grid_agency_price' // Default for reference
        },
        linked_price: {
          ratio: 15,
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