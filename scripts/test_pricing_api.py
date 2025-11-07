#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试定价模型API端点
"""

import requests
import json

# API基础URL
BASE_URL = "http://127.0.0.1:8005/api/v1"


def test_list_pricing_models():
    """测试：获取定价模型列表"""
    print("\n" + "="*80)
    print("测试1: GET /pricing-models")
    print("="*80)

    url = f"{BASE_URL}/pricing-models"

    # 测试1：获取所有模型
    print("\n1.1 获取所有定价模型")
    try:
        response = requests.get(url, timeout=5)
        print(f"状态码: {response.status_code}")

        if response.status_code == 200:
            models = response.json()
            print(f"共返回 {len(models)} 个模型")
            if models:
                print("\n前3个模型:")
                for model in models[:3]:
                    print(f"  - {model['model_code']:40s} | {model['display_name']}")
        else:
            print(f"错误: {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"请求失败: {e}")
        print("请确保后端服务正在运行 (uvicorn webapp.main:app --reload --host 0.0.0.0 --port 8005)")
        return None

    # 测试2：按 package_type 筛选
    print("\n1.2 按 package_type=time_based 筛选")
    response = requests.get(url, params={"package_type": "time_based"})
    print(f"状态码: {response.status_code}")

    if response.status_code == 200:
        models = response.json()
        print(f"分时模型: {len(models)} 个")
        for model in models[:3]:
            print(f"  - {model['model_code']}")

    # 测试3：按 package_type=non_time_based 筛选
    print("\n1.3 按 package_type=non_time_based 筛选")
    response = requests.get(url, params={"package_type": "non_time_based"})
    print(f"状态码: {response.status_code}")

    if response.status_code == 200:
        models = response.json()
        print(f"不分时模型: {len(models)} 个")
        for model in models[:3]:
            print(f"  - {model['model_code']}")

    return models[0] if response.status_code == 200 and models else None


def test_get_pricing_model(model_code: str):
    """测试：获取单个定价模型详情"""
    print("\n" + "="*80)
    print(f"测试2: GET /pricing-models/{model_code}")
    print("="*80)

    url = f"{BASE_URL}/pricing-models/{model_code}"
    
    try:
        response = requests.get(url, timeout=5)
        print(f"状态码: {response.status_code}")

        if response.status_code == 200:
            model = response.json()
            print(f"模型代码: {model['model_code']}")
            print(f"显示名称: {model['display_name']}")
            print(f"套餐类型: {model['package_type']}")
            print(f"定价模式: {model['pricing_mode']}")
            print(f"浮动类型: {model.get('floating_type', 'None')}")
            print(f"\n计算公式:")
            print(model['formula'][:200] + "..." if len(model['formula']) > 200 else model['formula'])
            print(f"\n套餐说明:")
            print(model['description'][:200] + "..." if len(model['description']) > 200 else model['description'])
        else:
            print(f"错误: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"请求失败: {e}")


def test_validate_pricing_config():
    """测试：验证定价配置"""
    print("\n" + "="*80)
    print("测试3: POST /pricing-models/{model_code}/validate")
    print("="*80)

    # 测试固定价格+联动价格+浮动费用模型（不分时）
    model_code = "fixed_linked_fee_non_time"

    # 测试用例1：有效配置
    print(f"\n3.1 测试有效配置 ({model_code})")
    url = f"{BASE_URL}/pricing-models/{model_code}/validate"
    valid_config = {
        "pricing_config": {
            "fixed_price_value": 0.40,
            "linked_ratio": 15.0,
            "linked_target": "day_ahead_avg",
            "floating_fee": 1000.0
        }
    }

    try:
        response = requests.post(url, json=valid_config, timeout=5)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"校验结果: valid={result['valid']}")
            if result.get('errors'):
                print(f"错误: {result['errors']}")
            if result.get('warnings'):
                print(f"警告: {result['warnings']}")
    except requests.exceptions.RequestException as e:
        print(f"请求失败: {e}")
        return

    # 测试用例2：固定价格超出范围
    print(f"\n3.2 测试固定价格超出范围")
    invalid_config = {
        "pricing_config": {
            "fixed_price_value": 0.60,  # 超出上限 0.49716
            "linked_ratio": 15.0,
            "linked_target": "day_ahead_avg",
            "floating_fee": 1000.0
        }
    }

    response = requests.post(url, json=invalid_config, timeout=5)
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"校验结果: valid={result['valid']}")
        if result.get('errors'):
            print(f"错误: {result['errors']}")

    # 测试用例3：联动比例超出范围
    print(f"\n3.3 测试联动比例超出范围")
    invalid_config = {
        "pricing_config": {
            "fixed_price_value": 0.40,
            "linked_ratio": 25.0,  # 超出上限 20%
            "linked_target": "day_ahead_avg",
            "floating_fee": 1000.0
        }
    }

    response = requests.post(url, json=invalid_config, timeout=5)
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"校验结果: valid={result['valid']}")
        if result.get('errors'):
            print(f"错误: {result['errors']}")

    # 测试用例4：分时模型 - 463号文比例校验
    print(f"\n3.4 测试分时模型价格比例校验")
    model_code = "fixed_linked_fee_time"
    url = f"{BASE_URL}/pricing-models/{model_code}/validate"

    time_config = {
        "pricing_config": {
            "fixed_price_peak": 0.60,     # 尖峰
            "fixed_price_high": 0.48,     # 峰
            "fixed_price_flat": 0.30,     # 平
            "fixed_price_valley": 0.12,   # 谷
            "fixed_price_deep_valley": 0.09,  # 深谷
            "linked_ratio": 15.0,
            "linked_target": "day_ahead_avg",
            "floating_fee": 1000.0
        }
    }

    response = requests.post(url, json=time_config, timeout=5)
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"校验结果: valid={result['valid']}")
        if result.get('errors'):
            print(f"错误: {result['errors']}")
        if result.get('warnings'):
            print(f"警告: {result['warnings']}")


def main():
    """主测试流程"""
    print("="*80)
    print("定价模型API端点测试")
    print("="*80)

    try:
        # 测试1：获取定价模型列表
        first_model = test_list_pricing_models()

        if first_model is None:
            print("\n无法继续测试，请先启动后端服务")
            return

        # 测试2：获取单个定价模型详情
        test_get_pricing_model(first_model['model_code'])

        # 测试3：验证定价配置
        test_validate_pricing_config()

        print("\n" + "="*80)
        print("所有测试完成！")
        print("="*80)

    except Exception as e:
        print(f"\n测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
