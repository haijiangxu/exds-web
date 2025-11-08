from typing import Optional, List, Dict, Any
from webapp.tools.mongo import DATABASE
from webapp.models.pricing_model import PricingModel, PricingModelListItem


class PricingModelService:
    """
    定价模型服务层
    处理定价模型的查询和校验逻辑
    """

    def __init__(self, db):
        self.db = db
        self.collection = self.db.pricing_models

    def list_pricing_models(
        self,
        package_type: Optional[str] = None,
        enabled: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """
        获取定价模型列表

        Args:
            package_type: 套餐类型筛选（time_based/non_time_based）
            enabled: 是否启用（True/False）

        Returns:
            定价模型列表
        """
        query = {}

        if package_type:
            query["package_type"] = package_type

        if enabled is not None:
            query["enabled"] = enabled

        # 按照 sort_order 排序
        cursor = self.collection.find(query).sort("sort_order", 1)

        models = []
        for doc in cursor:
            # 构建列表项数据
            list_item_data = {
                "_id": str(doc["_id"]),
                "model_code": doc.get("model_code"),
                "display_name": doc.get("display_name"),
                "package_type": doc.get("package_type"),
                "pricing_mode": doc.get("pricing_mode"),
                "floating_type": doc.get("floating_type"),
                "formula": doc.get("formula", ""),
                "description": doc.get("description", ""),
                "enabled": doc.get("enabled", True),
                "sort_order": doc.get("sort_order", 0)
            }

            list_item = PricingModelListItem(**list_item_data)
            models.append(list_item.model_dump(by_alias=False))

        return models

    def get_pricing_model(self, model_code: str) -> Optional[Dict[str, Any]]:
        """
        获取单个定价模型详情

        Args:
            model_code: 模型代码

        Returns:
            定价模型详情，如果不存在返回 None
        """
        doc = self.collection.find_one({"model_code": model_code})

        if not doc:
            return None

        model = PricingModel(**doc)
        return model.model_dump(by_alias=False)

    def validate_pricing_config(
        self,
        model_code: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        验证定价配置是否符合规则

        Args:
            model_code: 模型代码
            config: 定价配置字典

        Returns:
            校验结果 {"valid": bool, "errors": [], "warnings": []}
        """
        # 获取模型信息
        model = self.collection.find_one({"model_code": model_code})

        if not model:
            return {
                "valid": False,
                "errors": [f"未找到模型: {model_code}"],
                "warnings": []
            }

        errors = []
        warnings = []

        package_type = model.get("package_type")
        pricing_mode = model.get("pricing_mode")
        is_time_based = package_type == "time_based"

        # 1. 固定价格校验
        if pricing_mode in ["fixed_linked", "single_comprehensive"]:
            fixed_price_errors = self._validate_fixed_prices(config, is_time_based)
            errors.extend(fixed_price_errors)

        # 2. 联动比例校验
        if pricing_mode in ["fixed_linked", "reference_linked"]:
            linked_ratio = config.get("linked_ratio")
            if linked_ratio is not None:
                ratio_errors = self._validate_linked_ratio(linked_ratio, is_time_based)
                errors.extend(ratio_errors)

        # 3. 分时价格比例校验（463号文）
        if is_time_based and pricing_mode in ["fixed_linked", "single_comprehensive"]:
            ratio_warnings = self._validate_time_based_ratio(config)
            warnings.extend(ratio_warnings)

        # 4. 价差分成模型特殊校验
        if pricing_mode.startswith("price_spread"):
            spread_errors = self._validate_price_spread_config(config, pricing_mode)
            errors.extend(spread_errors)

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }

    def _validate_fixed_prices(
        self,
        config: Dict[str, Any],
        is_time_based: bool
    ) -> List[str]:
        """验证固定价格上下限"""
        UPPER_LIMIT = 0.49716  # 元/kWh
        LOWER_LIMIT = 0.33144  # 元/kWh

        errors = []

        if is_time_based:
            # 分时：检查各时段价格
            time_periods = ["peak", "high", "flat", "valley", "deep_valley"]
            for period in time_periods:
                price_key = f"fixed_price_{period}"
                price = config.get(price_key)

                if price is not None:
                    if price < LOWER_LIMIT or price > UPPER_LIMIT:
                        errors.append(
                            f"{period} 价格 {price:.5f} 元/kWh 超出范围 "
                            f"[{LOWER_LIMIT}, {UPPER_LIMIT}]"
                        )
        else:
            # 不分时：检查单一价格
            price = config.get("fixed_price_value")

            if price is not None:
                if price < LOWER_LIMIT or price > UPPER_LIMIT:
                    errors.append(
                        f"固定价格 {price:.5f} 元/kWh 超出范围 "
                        f"[{LOWER_LIMIT}, {UPPER_LIMIT}]"
                    )

        return errors

    def _validate_linked_ratio(self, ratio: Any, is_time_based: bool) -> List[str]:
        """验证联动电量比例"""
        errors = []
        try:
            ratio_float = float(ratio)
        except (ValueError, TypeError):
            return ["联动电量比例必须是一个有效的数字"]

        if is_time_based:
            if ratio_float < 10 or ratio_float > 20:
                errors.append("分时套餐联动电量比例应在10%-20%之间")
        else:
            if ratio_float > 20:
                errors.append("不分时套餐联动电量比例不得超过20%")

        return errors

    def _validate_time_based_ratio(self, config: Dict[str, Any]) -> List[str]:
        """验证463号文分时比例"""
        warnings = []

        flat = config.get("fixed_price_flat")

        if not flat or flat == 0:
            return warnings  # 平段价格不存在，不进行比例校验

        STANDARD_RATIOS = {
            "peak_to_flat": 1.8,      # 尖峰/平 = 1.8 (上浮80%)
            "high_to_flat": 1.6,      # 峰/平 = 1.6
            "valley_to_flat": 0.4,    # 谷/平 = 0.4
            "deep_valley_to_flat": 0.3  # 深谷/平 = 0.3 (下浮70%)
        }

        actual_ratios = {
            "peak_to_flat": (config.get("fixed_price_peak", 0) / flat) if flat else 0,
            "high_to_flat": (config.get("fixed_price_high", 0) / flat) if flat else 0,
            "valley_to_flat": (config.get("fixed_price_valley", 0) / flat) if flat else 0,
            "deep_valley_to_flat": (config.get("fixed_price_deep_valley", 0) / flat) if flat else 0,
        }

        # 允许0.01的误差
        non_compliant = []
        for key, expected in STANDARD_RATIOS.items():
            actual = actual_ratios[key]
            if abs(actual - expected) >= 0.01:
                non_compliant.append(
                    f"{key}: 实际={actual:.2f}, 标准={expected:.2f}"
                )

        if non_compliant:
            warnings.append(
                f"价格比例不符合463号文标准，结算时将自动调整: {', '.join(non_compliant)}"
            )

        return warnings

    def _validate_price_spread_config(
        self,
        config: Dict[str, Any],
        pricing_mode: str
    ) -> List[str]:
        """验证价差分成配置"""
        errors = []

        # 检查分成比例
        sharing_ratio = config.get("sharing_ratio")
        if sharing_ratio is not None:
            try:
                sharing_ratio_float = float(sharing_ratio)
                if sharing_ratio_float < 0 or sharing_ratio_float > 100:
                    errors.append("分成比例应在0%-100%之间")
            except (ValueError, TypeError):
                errors.append("分成比例必须是有效的数字")

        # 价差公式型需要检查3个参考价
        if pricing_mode == "price_spread_formula":
            required_refs = ["reference_1_type", "reference_2_type", "reference_3_type"]
            for ref in required_refs:
                if not config.get(ref):
                    errors.append(f"价差公式模型必须配置 {ref}")

        return errors


# 全局服务实例
pricing_model_service = PricingModelService(DATABASE)
