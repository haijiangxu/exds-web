#!/usr/bin/env python3
"""
根据客户档案的 short_name 重新生成所有合同名称

执行方式：
python scripts/update_contract_names_with_short_name.py

此脚本会：
1. 获取所有合同记录
2. 根据对应的客户档案中的 short_name 重新生成合同名称
3. 更新数据库记录
"""

import sys
import os
from datetime import datetime
from bson import ObjectId

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from webapp.tools.mongo import DATABASE


def generate_contract_name_from_customer(customer_id: str, purchase_start_month: datetime, db) -> str:
    """
    根据客户档案生成合同名称

    Args:
        customer_id: 客户ID
        purchase_start_month: 购电开始月份
        db: 数据库连接

    Returns:
        合同名称，如"恒力集团202401"
    """
    # 从客户档案获取客户简称
    try:
        customer = db.customers.find_one({
            "_id": ObjectId(customer_id),
            "status": "active"
        })

        if customer and customer.get("short_name"):
            short_name = customer["short_name"]
            print(f"    找到客户简称: {short_name}")
        else:
            # 如果无法获取客户简称，使用客户名称的前4个字符作为备选
            customer_name = customer.get("user_name", "") if customer else ""
            if customer_name:
                short_name = customer_name[:4]
                print(f"    未找到简称，使用客户名称前4位: {short_name}")
            else:
                short_name = "客户"
                print(f"    未找到客户信息，使用默认简称: {short_name}")
    except Exception as e:
        print(f"    获取客户信息时出错: {str(e)}")
        short_name = "客户"

    # 生成年月字符串（YYYYMM格式）
    year_month_str = purchase_start_month.strftime("%Y%m")

    return f"{short_name}{year_month_str}"


def update_all_contract_names():
    """
    更新所有合同的名称
    """
    print("开始更新所有合同名称...")

    try:
        # 连接到零售合同集合
        contracts_collection = DATABASE.retail_contracts

        # 获取所有合同记录
        all_contracts = list(contracts_collection.find({}))
        total_count = len(all_contracts)

        if total_count == 0:
            print("没有找到合同记录")
            return

        print(f"找到 {total_count} 条合同记录")

        # 批量更新合同记录
        updated_count = 0
        failed_count = 0
        skipped_count = 0

        for contract in all_contracts:
            try:
                contract_id = contract["_id"]
                customer_id = contract.get("customer_id", "")
                purchase_start_month = contract.get("purchase_start_month")
                current_contract_name = contract.get("contract_name", "")

                print(f"\n处理合同 {contract_id}:")

                # 检查必要字段
                if not customer_id:
                    print(f"  跳过: 缺少 customer_id 字段")
                    skipped_count += 1
                    continue

                if not purchase_start_month:
                    print(f"  跳过: 缺少 purchase_start_month 字段")
                    skipped_count += 1
                    continue

                # 根据客户档案生成新的合同名称
                new_contract_name = generate_contract_name_from_customer(
                    customer_id, purchase_start_month, DATABASE
                )

                # 检查是否需要更新
                if current_contract_name == new_contract_name:
                    print(f"  跳过: 合同名称已是最新 ({current_contract_name})")
                    skipped_count += 1
                    continue

                print(f"  原合同名称: {current_contract_name}")
                print(f"  新合同名称: {new_contract_name}")

                # 更新数据库记录
                result = contracts_collection.update_one(
                    {"_id": contract_id},
                    {"$set": {"contract_name": new_contract_name, "updated_at": datetime.utcnow()}}
                )

                if result.modified_count > 0:
                    updated_count += 1
                    print(f"  更新成功")
                else:
                    print(f"  更新失败")
                    failed_count += 1

            except Exception as e:
                print(f"  更新合同 {contract.get('_id', 'unknown')} 时出错: {str(e)}")
                failed_count += 1

        print(f"\n更新完成统计:")
        print(f"   - 总合同数: {total_count} 条")
        print(f"   - 成功更新: {updated_count} 条")
        print(f"   - 跳过更新: {skipped_count} 条")
        print(f"   - 更新失败: {failed_count} 条")
        print(f"   - 成功率: {(updated_count/total_count*100):.1f}%")

        if failed_count == 0:
            print("所有合同名称更新完成！")
        else:
            print("部分合同更新失败，请检查错误信息")

    except Exception as e:
        print(f"更新过程中发生错误: {str(e)}")
        raise


def verify_update_results():
    """
    验证更新结果
    """
    print("\n验证更新结果...")

    try:
        contracts_collection = DATABASE.retail_contracts

        # 统计合同名称
        total_contracts = contracts_collection.count_documents({})
        contracts_with_name = contracts_collection.count_documents({
            "contract_name": {"$exists": True, "$ne": ""}
        })

        print(f"数据库统计:")
        print(f"   - 总合同数: {total_contracts} 条")
        print(f"   - 包含 contract_name: {contracts_with_name} 条")

        # 显示一些示例合同名称
        sample_contracts = list(contracts_collection.find(
            {"contract_name": {"$exists": True, "$ne": ""}}
        ).limit(10))

        if sample_contracts:
            print(f"\n合同名称示例 (前10条):")
            for i, contract in enumerate(sample_contracts, 1):
                # 获取客户信息用于显示
                try:
                    customer_id = contract.get("customer_id")
                    customer = DATABASE.customers.find_one({"_id": ObjectId(customer_id)}) if customer_id else None
                    customer_short_name = customer.get("short_name", "无简称") if customer else "未知客户"
                    customer_name = customer.get("user_name", "无名称") if customer else "未知客户"
                except:
                    customer_short_name = "未知客户"
                    customer_name = "未知客户"

                contract_name = contract.get("contract_name", "无名称")
                purchase_start = contract.get("purchase_start_month")
                start_str = purchase_start.strftime("%Y-%m") if purchase_start else "未知"

                print(f"   {i}. {contract_name}")
                print(f"      客户: {customer_name} (简称: {customer_short_name})")
                print(f"      开始月份: {start_str}")
                print(f"      名称匹配: {'是' if contract_name.startswith(customer_short_name) else '否'}")
                print()

    except Exception as e:
        print(f"验证过程中发生错误: {str(e)}")


if __name__ == "__main__":
    print("=" * 60)
    print("根据客户档案简称更新合同名称脚本")
    print("=" * 60)

    try:
        # 执行更新
        update_all_contract_names()

        # 验证结果
        verify_update_results()

        print("\n" + "=" * 60)
        print("更新脚本执行完成")
        print("=" * 60)

    except KeyboardInterrupt:
        print("\n更新被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n更新失败: {str(e)}")
        sys.exit(1)