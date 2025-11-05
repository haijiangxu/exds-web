from webapp.models.retail_package import CustomPrices

class PricingEngine:
    """Retail package pricing calculation engine."""

    STANDARD_RATIOS = {
        "high_to_flat": 1.6,
        "valley_to_flat": 0.4,
        "deep_valley_to_flat": 0.3
    }

    @staticmethod
    def validate_price_ratio(custom_prices: CustomPrices) -> dict:
        """Validate if the price ratio complies with regulations."""
        if custom_prices.flat == 0:
            return {
                "compliant": False,
                "actual_ratios": {},
                "expected_ratios": PricingEngine.STANDARD_RATIOS,
                "warnings": ["平段电价不能为0"]
            }

        actual_ratios = {
            "high_to_flat": round(custom_prices.high / custom_prices.flat, 2),
            "valley_to_flat": round(custom_prices.valley / custom_prices.flat, 2),
            "deep_valley_to_flat": round(custom_prices.deep_valley / custom_prices.flat, 2)
        }

        compliant = all([
            abs(actual_ratios["high_to_flat"] - PricingEngine.STANDARD_RATIOS["high_to_flat"]) < 0.01,
            abs(actual_ratios["valley_to_flat"] - PricingEngine.STANDARD_RATIOS["valley_to_flat"]) < 0.01,
            abs(actual_ratios["deep_valley_to_flat"] - PricingEngine.STANDARD_RATIOS["deep_valley_to_flat"]) < 0.01
        ])
        
        warnings = []
        if not compliant:
            warnings.append("当前自定义价格比例不满足463号文要求，结算时将自动调整为标准比例。")

        return {
            "compliant": compliant,
            "actual_ratios": actual_ratios,
            "expected_ratios": PricingEngine.STANDARD_RATIOS,
            "warnings": warnings
        }
