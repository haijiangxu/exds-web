# NOTE: CustomPrices 类已经在重构中删除
# 这个文件中的 validate_price_ratio 方法已经被 pricing_model_service.py 中的新校验逻辑替代

class PricingEngine:
    """Retail package pricing calculation engine."""

    STANDARD_RATIOS = {
        "peak_to_flat": 1.8,      # 尖峰/平 = 1.8 (上浮80%)
        "high_to_flat": 1.6,      # 峰/平 = 1.6
        "valley_to_flat": 0.4,    # 谷/平 = 0.4
        "deep_valley_to_flat": 0.3  # 深谷/平 = 0.3 (下浮70%)
    }

    # NOTE: 此方法已废弃，使用 pricing_model_service.validate_pricing_config 替代
    # @staticmethod
    # def validate_price_ratio(custom_prices: CustomPrices) -> dict:
    #     """Validate if the price ratio complies with regulations."""
    #     pass
