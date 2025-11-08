export interface PricingModel {
    model_code: string;
    display_name: string;
    package_type: 'time_based' | 'non_time_based' | 'all';
    pricing_mode: 'fixed_linked' | 'reference_linked' | 'price_spread_simple' | 'price_spread_formula' | 'single_comprehensive';
    floating_type: 'price' | 'fee' | null;
    description: string;
    formula: string;
    schema: Record<string, any>; // JSON Schema for validation
    is_active: boolean;
  }
  