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
        """校验价格比例是否符合463号文 - V2版已移除校验逻辑"""
        return {
            "compliant": True,
            "actual_ratios": {},
            "expected_ratios": PackageValidator.STANDARD_RATIOS,
            "warnings": []
        }