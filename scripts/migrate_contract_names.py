#!/usr/bin/env python3
"""
数据迁移脚本：为现有零售合同生成 contract_name 字段

执行方式：
python scripts/migrate_contract_names.py

此脚本会：
1. 连接到MongoDB数据库
2. 查找所有缺少 contract_name 字段的合同记录
3. 根据客户名称和购电开始月份自动生成合同名称
4. 更新数据库记录
"""

import sys
import os
from datetime import datetime
from bson import ObjectId

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from webapp.tools.mongo import DATABASE


def generate_contract_name(customer_id: str, purchase_start_month: datetime, db) -> str:
    """
    生成合同名称（客户简称 + 购电开始年月）

    Args:
        customer_id: 客户ID
        purchase_start_month: 购电开始月份
        db: 数据库连接

    Returns:
        合同名称，如"供服中心202509"
    """
    # 从客户档案获取客户简称
    try:
        customer = db.customers.find_one({
            "_id": ObjectId(customer_id),
            "status": "active"
        })

        if customer and customer.get("short_name"):
            short_name = customer["short_name"]
        else:
            # 如果无法获取客户简称，使用客户名称的前4个字符作为备选
            customer_name = customer.get("user_name", "") if customer else ""
            if customer_name:
                short_name = customer_name[:4]
            else:
                short_name = "客户"
    except Exception as e:
        print(f"获取客户信息时出错: {str(e)}")
        short_name = "客户"

    # 生成年月字符串（YYYYMM格式）
    year_month_str = purchase_start_month.strftime("%Y%m")

    return f"{short_name}{year_month_str}"


def migrate_contract_names():
    """
    迁移合同名称字段
    """
    print("开始迁移零售合同名称字段...")

    try:
        # 连接到零售合同集合
        contracts_collection = DATABASE.retail_contracts

        # 查找所有缺少 contract_name 字段的合同记录
        query = {
            "$or": [
                {"contract_name": {"$exists": False}},
                {"contract_name": {"$eq": ""}},
                {"contract_name": {"$eq": None}}
            ]
        }

        contracts_to_update = list(contracts_collection.find(query))
        total_count = len(contracts_to_update)

        if total_count == 0:
            print("所有合同记录都已包含 contract_name 字段，无需迁移。")
            return

        print(f"找到 {total_count} 条需要更新的合同记录")

        # 批量更新合同记录
        updated_count = 0
        failed_count = 0

        for contract in contracts_to_update:
            try:
                # 获取必要的数据
                customer_id = contract.get("customer_id", "")
                purchase_start_month = contract.get("purchase_start_month")

                if not purchase_start_month:
                    print(f"跳过记录 {contract['_id']}: 缺少 purchase_start_month 字段")
                    failed_count += 1
                    continue

                if not customer_id:
                    print(f"跳过记录 {contract['_id']}: 缺少 customer_id 字段")
                    failed_count += 1
                    continue

                # 生成合同名称
                contract_name = generate_contract_name(customer_id, purchase_start_month, DATABASE)

                # 更新数据库记录
                result = contracts_collection.update_one(
                    {"_id": contract["_id"]},
                    {"$set": {"contract_name": contract_name}}
                )

                if result.modified_count > 0:
                    updated_count += 1
                    # 获取客户信息用于显示
                    try:
                        customer = DATABASE.customers.find_one({"_id": ObjectId(customer_id)})
                        customer_display = customer.get("short_name", customer.get("user_name", "未知客户")) if customer else "未知客户"
                    except:
                        customer_display = "未知客户"
                    print(f"更新合同 {contract['_id']}: {customer_display} -> {contract_name}")
                else:
                    print(f"合同 {contract['_id']} 更新失败")
                    failed_count += 1

            except Exception as e:
                print(f"更新合同 {contract.get('_id', 'unknown')} 时出错: {str(e)}")
                failed_count += 1

        print(f"\n迁移完成统计:")
        print(f"   - 总计需要更新: {total_count} 条")
        print(f"   - 成功更新: {updated_count} 条")
        print(f"   - 更新失败: {failed_count} 条")
        print(f"   - 成功率: {(updated_count/total_count*100):.1f}%")

        if failed_count == 0:
            print("所有合同记录已成功迁移！")
        else:
            print("部分记录迁移失败，请检查错误信息")

    except Exception as e:
        print(f"迁移过程中发生错误: {str(e)}")
        raise


def verify_migration():
    """
    验证迁移结果
    """
    print("\n验证迁移结果...")

    try:
        contracts_collection = DATABASE.retail_contracts

        # 检查是否还有缺少 contract_name 字段的记录
        missing_count = contracts_collection.count_documents({
            "$or": [
                {"contract_name": {"$exists": False}},
                {"contract_name": {"$eq": ""}},
                {"contract_name": {"$eq": None}}
            ]
        })

        total_count = contracts_collection.count_documents({})

        print(f"数据库统计:")
        print(f"   - 总合同数: {total_count} 条")
        print(f"   - 缺少 contract_name: {missing_count} 条")
        print(f"   - 包含 contract_name: {total_count - missing_count} 条")

        if missing_count == 0:
            print("验证通过：所有合同记录都包含 contract_name 字段")
        else:
            print("验证失败：仍有合同记录缺少 contract_name 字段")

        # 显示一些示例合同名称
        sample_contracts = list(contracts_collection.find(
            {"contract_name": {"$exists": True, "$ne": ""}}
        ).limit(5))

        if sample_contracts:
            print("\n合同名称示例:")
            for contract in sample_contracts:
                # 获取客户信息用于显示
                try:
                    customer_id = contract.get("customer_id")
                    customer = DATABASE.customers.find_one({"_id": ObjectId(customer_id)}) if customer_id else None
                    customer_display = customer.get("short_name", customer.get("user_name", "未知客户")) if customer else "未知客户"
                except:
                    customer_display = "未知客户"

                print(f"   - {customer_display}: {contract.get('contract_name', 'Unknown')}")

    except Exception as e:
        print(f"验证过程中发生错误: {str(e)}")


if __name__ == "__main__":
    print("=" * 60)
    print("零售合同名称字段迁移脚本")
    print("=" * 60)

    try:
        # 执行迁移
        migrate_contract_names()

        # 验证结果
        verify_migration()

        print("\n" + "=" * 60)
        print("迁移脚本执行完成")
        print("=" * 60)

    except KeyboardInterrupt:
        print("\n迁移被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n迁移失败: {str(e)}")
        sys.exit(1)