from webapp.tools.package_validator import PackageValidator

class PricingEngine:
    """零售套餐定价计算引擎"""

    @staticmethod
    def validate_price_ratio(custom_prices: dict) -> dict:
        """校验价格比例是否符合463号文"""
        return PackageValidator.validate_price_ratio(custom_prices)

    @staticmethod
    async def get_market_price(date: str, time_period: str) -> float:
        # This is a mock function. In a real scenario, you would fetch this from a database.
        # For demonstration, returning a fixed value.
        market_prices = {
            "peak": 550,
            "high": 500,
            "flat": 450,
            "valley": 400,
            "deep_valley": 350
        }
        return market_prices.get(time_period, 450) # Default to flat price

    @staticmethod
    async def calculate_fixed_linked_price(
        package_config: dict,
        date: str,
        time_period: str,
        volume_mwh: float
    ) -> dict:
        """计算固定+联动模式价格"""
        # 1. 获取固定价格
        fixed_price = package_config['fixed_linked_config']['fixed_price']['custom_prices'][time_period]

        # 2. 获取联动价格（从市场数据）
        linked_ratio = package_config['fixed_linked_config']['linked_price']['ratio']
        market_price = await PricingEngine.get_market_price(date, time_period)  # 从数据库获取
        linked_price = market_price * linked_ratio

        # 3. 浮动费用
        floating_fee = package_config['fixed_linked_config']['floating_fee']

        # 4. 总价
        total_price = fixed_price + linked_price + floating_fee

        return {
            "fixed_price": fixed_price,
            "linked_price": linked_price,
            "floating_fee": floating_fee,
            "total_price": total_price,
            "breakdown": {
                "fixed_component": fixed_price * volume_mwh,
                "linked_component": linked_price * volume_mwh,
                "floating_component": floating_fee * volume_mwh * 1000 # convert MWh to kWh
            }
        }