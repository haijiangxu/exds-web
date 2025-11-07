#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
初始化定价模型配置脚本
从 docs/零售套餐模型.json 导入18种定价模型到 pricing_models 集合
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from webapp.tools.mongo import DATABASE


def infer_model_attributes(model_name: str, is_time_based: bool) -> dict:
    """
    根据模型名称推断 pricing_mode、floating_type 和 model_code

    Args:
        model_name: 模型名称
        is_time_based: 是否为分时模型

    Returns:
        包含 pricing_mode, floating_type, model_code 的字典
    """
    package_type_suffix = "time" if is_time_based else "non_time"

    # 单一综合价模型
    if "单一综合价_固定价" in model_name:
        return {
            "pricing_mode": "single_comprehensive",
            "floating_type": None,
            "model_code": f"single_comprehensive_fixed_{package_type_suffix}"
        }
    elif "单一综合价_参考价" in model_name:
        return {
            "pricing_mode": "single_comprehensive",
            "floating_type": None,
            "model_code": f"single_comprehensive_reference_{package_type_suffix}"
        }

    # 固定价格+联动价格系列
    if "固定价格+联动价格" in model_name:
        pricing_mode = "fixed_linked"
        if "浮动费用" in model_name:
            floating_type = "fee"
        elif "浮动价" in model_name:
            floating_type = "price"
        else:
            floating_type = "fee"  # 默认
        return {
            "pricing_mode": pricing_mode,
            "floating_type": floating_type,
            "model_code": f"{pricing_mode}_{floating_type}_{package_type_suffix}"
        }

    # 参考价+联动价格系列
    if "参考价+联动价格" in model_name:
        pricing_mode = "reference_linked"
        if "浮动费用" in model_name:
            floating_type = "fee"
        elif "浮动价" in model_name:
            floating_type = "price"
        else:
            floating_type = "fee"
        return {
            "pricing_mode": pricing_mode,
            "floating_type": floating_type,
            "model_code": f"{pricing_mode}_{floating_type}_{package_type_suffix}"
        }

    # 价差分成系列
    if "价差分成" in model_name:
        # 区分简单价差和公式价差
        if "（常规）2" in model_name or "（分时）2" in model_name:
            pricing_mode = "price_spread_formula"
        else:
            pricing_mode = "price_spread_simple"

        if "浮动费用" in model_name:
            floating_type = "fee"
        elif "浮动价" in model_name:
            floating_type = "price"
        else:
            floating_type = "fee"

        return {
            "pricing_mode": pricing_mode,
            "floating_type": floating_type,
            "model_code": f"{pricing_mode}_{floating_type}_{package_type_suffix}"
        }

    # 默认情况
    raise ValueError(f"无法识别的模型名称: {model_name}")


def convert_json_to_pricing_model(json_item: dict, sort_order: int) -> dict:
    """
    将JSON格式的模型数据转换为 PricingModel 格式

    Args:
        json_item: JSON中的单个模型数据
        sort_order: 排序序号

    Returns:
        符合 PricingModel 结构的字典
    """
    model_name = json_item["模式名称"]
    is_time_based = json_item["分时段"] == "分时"
    package_type = "time_based" if is_time_based else "non_time_based"

    # 推断模型属性
    attrs = infer_model_attributes(model_name, is_time_based)

    return {
        "model_code": attrs["model_code"],
        "display_name": model_name,
        "package_type": package_type,
        "pricing_mode": attrs["pricing_mode"],
        "floating_type": attrs["floating_type"],
        "formula": json_item["计算公式"],
        "description": json_item["套餐说明"],
        "enabled": True,
        "sort_order": sort_order,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }


def init_pricing_models():
    """初始化定价模型配置"""
    # 读取JSON文件
    json_file = project_root / "docs" / "零售套餐模型.json"
    print(f"正在读取模型配置文件: {json_file}")

    with open(json_file, "r", encoding="utf-8") as f:
        models_data = json.load(f)

    print(f"共读取 {len(models_data)} 个模型")

    # 连接数据库（DATABASE 已经是 pymongo.Database 对象）
    collection = DATABASE["pricing_models"]

    # 检查集合是否已存在数据
    existing_count = collection.count_documents({})
    if existing_count > 0:
        print(f"[警告] pricing_models 集合已存在 {existing_count} 条数据")
        response = input("是否清空并重新导入？(y/n): ")
        if response.lower() != 'y':
            print("操作已取消")
            return
        collection.delete_many({})
        print("已清空现有数据")

    # 转换并插入数据
    pricing_models = []
    for idx, item in enumerate(models_data, start=1):
        try:
            model = convert_json_to_pricing_model(item, sort_order=idx)
            pricing_models.append(model)
            print(f"[OK] [{idx:2d}] {model['model_code']:40s} - {model['display_name']}")
        except Exception as e:
            print(f"[FAIL] [{idx:2d}] 转换失败: {item.get('模式名称', 'Unknown')} - {e}")
            raise

    # 批量插入
    if pricing_models:
        result = collection.insert_many(pricing_models)
        print(f"\n[成功] 成功导入 {len(result.inserted_ids)} 个定价模型")

        # 创建索引
        collection.create_index("model_code", unique=True)
        collection.create_index([("package_type", 1), ("enabled", 1)])
        collection.create_index("sort_order")
        print("[成功] 已创建索引")
    else:
        print("[失败] 没有可导入的数据")


def verify_import():
    """验证导入结果"""
    collection = DATABASE["pricing_models"]

    print("\n" + "="*80)
    print("验证导入结果")
    print("="*80)

    # 统计总数
    total = collection.count_documents({})
    print(f"总计: {total} 个模型")

    # 按 package_type 分组统计
    for package_type in ["non_time_based", "time_based"]:
        count = collection.count_documents({"package_type": package_type})
        type_name = "不分时" if package_type == "non_time_based" else "分时"
        print(f"  - {type_name}: {count} 个")

    # 按 pricing_mode 分组统计
    print("\n按定价模式统计:")
    pipeline = [
        {"$group": {"_id": "$pricing_mode", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    for doc in collection.aggregate(pipeline):
        print(f"  - {doc['_id']}: {doc['count']} 个")

    # 列出所有模型代码
    print("\n所有模型代码:")
    for doc in collection.find({}, {"model_code": 1, "display_name": 1}).sort("sort_order", 1):
        print(f"  {doc['model_code']:40s} - {doc['display_name']}")


if __name__ == "__main__":
    print("="*80)
    print("定价模型配置初始化脚本")
    print("="*80)

    try:
        init_pricing_models()
        verify_import()
        print("\n[成功] 初始化完成！")
    except Exception as e:
        print(f"\n[失败] 初始化失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
