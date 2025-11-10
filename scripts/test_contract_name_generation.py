#!/usr/bin/env python3
"""
测试合同名称生成功能

此脚本测试新的合同名称生成逻辑，确保使用客户的 short_name 字段
"""

import sys
import os
from datetime import datetime
from bson import ObjectId

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from webapp.tools.mongo import DATABASE
from webapp.services.contract_service import ContractService


def test_contract_name_generation():
    """
    测试合同名称生成功能
    """
    print("=" * 60)
    print("测试合同名称生成功能")
    print("=" * 60)

    try:
        # 创建合同服务实例
        service = ContractService(DATABASE)

        # 获取一些测试数据
        print("\n1. 检查测试数据...")

        # 查找一些客户
        customers = list(DATABASE.customers.find({"status": "active"}).limit(3))
        if not customers:
            print("没有找到活跃客户，跳过测试")
            return

        print(f"找到 {len(customers)} 个活跃客户")

        # 查找一些套餐
        packages = list(DATABASE.retail_packages.find({"status": "active"}).limit(3))
        if not packages:
            print("没有找到活跃套餐，跳过测试")
            return

        print(f"找到 {len(packages)} 个活跃套餐")

        # 测试合同名称生成
        print("\n2. 测试合同名称生成...")

        for i, customer in enumerate(customers):
            customer_id = str(customer["_id"])
            short_name = customer.get("short_name", "无简称")
            user_name = customer.get("user_name", "无名称")

            # 测试不同的开始月份
            test_dates = [
                datetime(2024, 1, 1),
                datetime(2024, 6, 1),
                datetime(2024, 12, 1),
            ]

            print(f"\n客户 {i+1}: {user_name} (简称: {short_name})")

            for date in test_dates:
                try:
                    contract_name = service._generate_contract_name(customer_id, date)
                    expected_name = f"{short_name}{date.strftime('%Y%m')}"

                    print(f"  - {date.strftime('%Y-%m')}: {contract_name}")

                    if contract_name == expected_name:
                        print(f"    正确 (期望: {expected_name})")
                    else:
                        print(f"    错误 (期望: {expected_name})")

                except Exception as e:
                    print(f"    生成失败: {str(e)}")

        print("\n3. 检查现有合同名称...")

        # 检查现有合同的名称格式
        contracts = list(DATABASE.retail_contracts.find({}).limit(5))

        for i, contract in enumerate(contracts):
            contract_id = str(contract["_id"])
            contract_name = contract.get("contract_name", "无名称")
            customer_id = contract.get("customer_id")

            print(f"\n合同 {i+1}: {contract_name}")

            # 获取对应的客户信息
            if customer_id:
                try:
                    customer = DATABASE.customers.find_one({"_id": ObjectId(customer_id)})
                    if customer:
                        customer_short_name = customer.get("short_name", "无简称")
                        print(f"  - 客户简称: {customer_short_name}")

                        # 检查合同名称是否以客户简称开头
                        if contract_name.startswith(customer_short_name):
                            print(f"  名称格式正确")
                        else:
                            print(f"  名称格式不正确")
                except Exception as e:
                    print(f"  - 获取客户信息失败: {str(e)}")

        print("\n" + "=" * 60)
        print("测试完成")
        print("=" * 60)

    except Exception as e:
        print(f"测试过程中发生错误: {str(e)}")
        raise


if __name__ == "__main__":
    test_contract_name_generation()