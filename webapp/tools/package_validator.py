# webapp/tools/package_validator.py

class PackageValidator:
    """套餐校验工具类"""

    STANDARD_RATIOS = {
        "high_to_flat": 1.6,
        "valley_to_flat": 0.4,
        "deep_valley_to_flat": 0.3
    }

    @staticmethod
    def validate_price_ratio(custom_prices: dict) -> dict:
        """校验价格比例是否符合463号文"""
        if 'flat' not in custom_prices or custom_prices['flat'] == 0:
            return {
                "compliant": False,
                "actual_ratios": {},
                "expected_ratios": PackageValidator.STANDARD_RATIOS,
                "warnings": ["平时段价格不能为0"]
            }

        flat = custom_prices['flat']
        actual_ratios = {
            "high_to_flat": round(custom_prices.get('high', 0) / flat, 2),
            "valley_to_flat": round(custom_prices.get('valley', 0) / flat, 2),
            "deep_valley_to_flat": round(custom_prices.get('deep_valley', 0) / flat, 2)
        }

        compliant = all([
            abs(actual_ratios["high_to_flat"] - PackageValidator.STANDARD_RATIOS["high_to_flat"]) < 0.01,
            abs(actual_ratios["valley_to_flat"] - PackageValidator.STANDARD_RATIOS["valley_to_flat"]) < 0.01,
            abs(actual_ratios["deep_valley_to_flat"] - PackageValidator.STANDARD_RATIOS["deep_valley_to_flat"]) < 0.01
        ])

        warnings = []
        if not compliant:
            warnings.append("当前自定义价格比例不满足463号文要求，结算时将自动调整为标准比例。")

        return {
            "compliant": compliant,
            "actual_ratios": actual_ratios,
            "expected_ratios": PackageValidator.STANDARD_RATIOS,
            "warnings": warnings
        }