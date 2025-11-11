"""
诊断客户和合同关联问题
检查为什么无法找到生效的合同
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from webapp.tools.mongo import DATABASE
from bson import ObjectId


def diagnose():
    """诊断客户和合同关联"""

    customers_collection = DATABASE.customers
    contracts_collection = DATABASE.retail_contracts

    print("=" * 80)
    print("诊断客户和合同关联")
    print("=" * 80)
    print()

    # 1. 统计合同状态
    print("1. 合同状态统计：")
    print("-" * 80)
    contract_statuses = contracts_collection.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ])
    for status in contract_statuses:
        print(f"  状态 '{status['_id']}': {status['count']} 份")
    print()

    # 2. 检查合同的 customer_id 字段类型
    print("2. 检查合同的 customer_id 字段类型：")
    print("-" * 80)
    sample_contracts = list(contracts_collection.find().limit(5))
    for i, contract in enumerate(sample_contracts, 1):
        customer_id = contract.get("customer_id")
        customer_name = contract.get("customer_name", "未知")
        status = contract.get("status", "未知")
        print(f"  合同 {i}:")
        print(f"    客户名称: {customer_name}")
        print(f"    合同状态: {status}")
        print(f"    customer_id: {customer_id}")
        print(f"    customer_id 类型: {type(customer_id).__name__}")

        # 尝试匹配客户
        if customer_id:
            # 先按字符串匹配
            customer_by_str = customers_collection.find_one({"_id": ObjectId(customer_id)}) if ObjectId.is_valid(customer_id) else None
            if customer_by_str:
                print(f"    [OK] 找到客户: {customer_by_str.get('user_name')}")
            else:
                print(f"    [ERROR] 无法找到对应的客户")
        print()

    # 3. 检查客户ID格式
    print("3. 检查客户的 _id 格式：")
    print("-" * 80)
    sample_customers = list(customers_collection.find().limit(3))
    for i, customer in enumerate(sample_customers, 1):
        customer_id = customer.get("_id")
        user_name = customer.get("user_name", "未知")
        print(f"  客户 {i}:")
        print(f"    客户名称: {user_name}")
        print(f"    _id: {customer_id}")
        print(f"    _id 类型: {type(customer_id).__name__}")
        print(f"    _id (str): {str(customer_id)}")

        # 查找该客户的合同
        contracts_by_str_id = contracts_collection.find({"customer_id": str(customer_id)})
        count = contracts_collection.count_documents({"customer_id": str(customer_id)})
        print(f"    关联的合同数: {count}")

        if count > 0:
            for contract in contracts_by_str_id:
                print(f"      - 合同状态: {contract.get('status')}, 编号: {contract.get('contract_number')}")
        print()

    # 4. 检查生效的合同
    print("4. 生效的合同列表：")
    print("-" * 80)
    effective_contracts = list(contracts_collection.find({"status": "effective"}))
    print(f"  总数: {len(effective_contracts)}")
    for i, contract in enumerate(effective_contracts[:5], 1):
        print(f"  合同 {i}:")
        print(f"    客户名称: {contract.get('customer_name')}")
        print(f"    合同编号: {contract.get('contract_number')}")
        print(f"    customer_id: {contract.get('customer_id')}")
    print()

    # 5. 推荐的修复方案
    print("5. 诊断结论和修复建议：")
    print("-" * 80)

    # 检查是否所有合同的 customer_id 都是字符串
    all_customer_ids = contracts_collection.distinct("customer_id")
    print(f"  合同中不同的 customer_id 数量: {len(all_customer_ids)}")

    # 检查是否有客户ID不匹配的情况
    mismatched_count = 0
    for cid in all_customer_ids[:10]:  # 只检查前10个
        if cid and ObjectId.is_valid(cid):
            customer = customers_collection.find_one({"_id": ObjectId(cid)})
            if not customer:
                mismatched_count += 1

    print(f"  检查前10个合同，找不到对应客户的数量: {mismatched_count}")
    print()

    if mismatched_count > 0:
        print("  [建议] customer_id 字段可能存在问题，需要修复客户ID关联")
    else:
        print("  [建议] customer_id 关联正常，可能是合同状态的问题")


if __name__ == "__main__":
    diagnose()
