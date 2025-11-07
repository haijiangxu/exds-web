#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试定价模型配置读取
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from webapp.tools.mongo import DATABASE
from webapp.models.pricing_model import PricingModel
from pydantic import ValidationError


def test_read_all_models():
    """测试读取所有定价模型"""
    print("="*80)
    print("测试1: 读取所有定价模型")
    print("="*80)

    collection = DATABASE["pricing_models"]
    models = list(collection.find({}))

    print(f"数据库中共有 {len(models)} 个模型\n")

    for model_dict in models:
        try:
            # 使用 Pydantic 模型验证数据
            model = PricingModel(**model_dict)
            print(f"[OK] {model.model_code:40s} - {model.display_name}")
        except ValidationError as e:
            print(f"[FAIL] 验证失败: {model_dict.get('model_code', 'Unknown')}")
            print(f"  错误: {e}")

    print(f"\n成功验证 {len(models)} 个模型\n")


def test_read_by_package_type():
    """测试按套餐类型查询"""
    print("="*80)
    print("测试2: 按套餐类型查询")
    print("="*80)

    collection = DATABASE["pricing_models"]

    for package_type in ["non_time_based", "time_based"]:
        models = list(collection.find({"package_type": package_type}).sort("sort_order", 1))
        type_name = "不分时" if package_type == "non_time_based" else "分时"
        print(f"\n{type_name}模型 ({len(models)} 个):")

        for model_dict in models:
            model = PricingModel(**model_dict)
            print(f"  - {model.model_code:40s} {model.display_name}")


def test_read_by_pricing_mode():
    """测试按定价模式查询"""
    print("\n" + "="*80)
    print("测试3: 按定价模式查询")
    print("="*80)

    collection = DATABASE["pricing_models"]

    pricing_modes = ["fixed_linked", "reference_linked", "price_spread_simple",
                     "price_spread_formula", "single_comprehensive"]

    for pricing_mode in pricing_modes:
        models = list(collection.find({"pricing_mode": pricing_mode}).sort("sort_order", 1))
        print(f"\n{pricing_mode} ({len(models)} 个):")

        for model_dict in models:
            model = PricingModel(**model_dict)
            floating_str = f"[{model.floating_type}]" if model.floating_type else "[N/A]"
            package_str = "[分时]" if model.package_type == "time_based" else "[不分时]"
            print(f"  - {model.model_code:40s} {floating_str:10s} {package_str:10s} {model.display_name}")


def test_read_single_model():
    """测试读取单个模型详情"""
    print("\n" + "="*80)
    print("测试4: 读取单个模型详情")
    print("="*80)

    collection = DATABASE["pricing_models"]

    # 读取一个示例模型
    model_code = "fixed_linked_fee_time"
    model_dict = collection.find_one({"model_code": model_code})

    if model_dict:
        model = PricingModel(**model_dict)
        print(f"\n模型代码: {model.model_code}")
        print(f"显示名称: {model.display_name}")
        print(f"套餐类型: {model.package_type}")
        print(f"定价模式: {model.pricing_mode}")
        print(f"浮动类型: {model.floating_type}")
        print(f"是否启用: {model.enabled}")
        print(f"排序: {model.sort_order}")
        print(f"\n计算公式:\n{model.formula}")
        print(f"\n套餐说明:\n{model.description[:200]}...")  # 只显示前200个字符
    else:
        print(f"[FAIL] 未找到模型: {model_code}")


def test_query_with_filters():
    """测试复合查询"""
    print("\n" + "="*80)
    print("测试5: 复合查询（分时 + 启用的模型）")
    print("="*80)

    collection = DATABASE["pricing_models"]

    models = list(collection.find({
        "package_type": "time_based",
        "enabled": True
    }).sort("sort_order", 1))

    print(f"\n找到 {len(models)} 个符合条件的模型:\n")

    for model_dict in models:
        model = PricingModel(**model_dict)
        print(f"  {model.sort_order:2d}. {model.model_code:40s} - {model.display_name}")


if __name__ == "__main__":
    try:
        test_read_all_models()
        test_read_by_package_type()
        test_read_by_pricing_mode()
        test_read_single_model()
        test_query_with_filters()
        print("\n" + "="*80)
        print("[成功] 所有测试通过！")
        print("="*80)
    except Exception as e:
        print(f"\n[失败] 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
