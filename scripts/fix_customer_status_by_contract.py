"""
根据合同状态修正客户状态

业务规则：
1. 如果客户有生效的合同（当前日期在购电期内）-> active (执行中)
2. 如果客户只有待生效的合同（当前日期在购电开始日期之前）-> pending (待生效)
3. 如果客户没有任何合同，或只有已过期的合同 -> prospect (意向客户)

注意：合同状态是动态计算的，不存储在数据库中
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from webapp.tools.mongo import DATABASE
from datetime import datetime


def calculate_contract_status(purchase_start_month: datetime, purchase_end_month: datetime) -> str:
    """
    计算合同状态

    规则：
    - 待生效 (pending): 当前月份 < 购电开始月份
    - 生效 (active): 当前月份 >= 购电开始月份 且 <= 购电结束月份
    - 已过期 (expired): 当前月份 > 购电结束月份
    """
    now = datetime.utcnow()
    # 将所有日期统一为每月1号进行比较
    current_month = datetime(now.year, now.month, 1)
    start_month = datetime(purchase_start_month.year, purchase_start_month.month, 1)
    end_month = datetime(purchase_end_month.year, purchase_end_month.month, 1)

    if current_month < start_month:
        return "pending"
    elif current_month > end_month:
        return "expired"
    else:
        return "active"


def fix_customer_status():
    """根据合同状态修正客户状态"""

    customers_collection = DATABASE.customers
    contracts_collection = DATABASE.retail_contracts

    # 统计信息
    stats = {
        "total": 0,
        "to_active": 0,
        "to_pending": 0,
        "to_prospect": 0,
        "no_change": 0,
        "errors": 0,
        "contracts_checked": 0
    }

    # 获取所有客户
    customers = list(customers_collection.find({}))
    stats["total"] = len(customers)

    print(f"找到 {stats['total']} 个客户需要检查状态...")
    print("-" * 80)

    for customer in customers:
        customer_id = customer["_id"]
        current_status = customer.get("status", "prospect")
        user_name = customer.get("user_name", "未知客户")

        try:
            # 查找客户的所有合同
            customer_id_str = str(customer_id)
            contracts = list(contracts_collection.find({"customer_id": customer_id_str}))
            stats["contracts_checked"] += len(contracts)

            # 计算每份合同的实际状态
            has_active_contract = False
            has_pending_contract = False

            for contract in contracts:
                start_month = contract.get("purchase_start_month")
                end_month = contract.get("purchase_end_month")

                if start_month and end_month:
                    contract_status = calculate_contract_status(start_month, end_month)
                    if contract_status == "active":
                        has_active_contract = True
                    elif contract_status == "pending":
                        has_pending_contract = True

            # 根据合同状态确定新状态
            new_status = None

            if has_active_contract:
                new_status = "active"  # 有生效合同 -> 执行中
            elif has_pending_contract:
                new_status = "pending"  # 只有待生效合同 -> 待生效
            else:
                new_status = "prospect"  # 无合同或只有过期合同 -> 意向客户

            # 检查是否需要更新
            if new_status == current_status:
                stats["no_change"] += 1
                print(f"[OK] 客户 '{user_name}' 状态正确: {current_status} (合同数: {len(contracts)})")
            else:
                # 更新客户状态
                customers_collection.update_one(
                    {"_id": customer_id},
                    {
                        "$set": {
                            "status": new_status,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )

                if new_status == "active":
                    stats["to_active"] += 1
                elif new_status == "pending":
                    stats["to_pending"] += 1
                elif new_status == "prospect":
                    stats["to_prospect"] += 1

                print(f"[FIX] 客户 '{user_name}': {current_status} -> {new_status} (合同数: {len(contracts)})")

        except Exception as e:
            stats["errors"] += 1
            print(f"[ERROR] 客户 '{user_name}' 处理失败: {str(e)}")

    # 打印统计信息
    print("-" * 80)
    print("\n修正完成！统计信息：")
    print(f"总客户数: {stats['total']}")
    print(f"检查的合同数: {stats['contracts_checked']}")
    print(f"状态正确无需修改: {stats['no_change']}")
    print(f"修改为 active (执行中): {stats['to_active']}")
    print(f"修改为 pending (待生效): {stats['to_pending']}")
    print(f"修改为 prospect (意向客户): {stats['to_prospect']}")
    print(f"错误数: {stats['errors']}")

    return stats


if __name__ == "__main__":
    print("=" * 80)
    print("根据合同状态修正客户状态")
    print("=" * 80)
    print()

    # 确认提示
    response = input("是否开始修正客户状态？(yes/no): ")
    if response.lower() != "yes":
        print("已取消修正")
        sys.exit(0)

    print()
    fix_customer_status()
    print()
    print("=" * 80)
