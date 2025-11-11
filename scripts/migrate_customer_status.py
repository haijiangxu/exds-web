"""
客户状态迁移脚本
将客户状态从旧的3状态体系迁移到新的5状态体系

旧状态 -> 新状态映射规则：
1. active (正常) -> 根据是否有生效合同判断
   - 有生效合同 -> active (执行中)
   - 无生效合同 -> prospect (意向客户)
2. inactive (停用) -> suspended (已暂停)
3. deleted (已删除) -> terminated (已终止)
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from webapp.tools.mongo import DATABASE
from datetime import datetime


def migrate_customer_status():
    """执行客户状态迁移"""

    customers_collection = DATABASE.customers
    contracts_collection = DATABASE.retail_contracts

    # 统计信息
    stats = {
        "total": 0,
        "active_to_active": 0,
        "active_to_prospect": 0,
        "inactive_to_suspended": 0,
        "deleted_to_terminated": 0,
        "already_migrated": 0,
        "errors": 0
    }

    # 获取所有客户
    customers = list(customers_collection.find({}))
    stats["total"] = len(customers)

    print(f"找到 {stats['total']} 个客户需要迁移状态...")
    print("-" * 80)

    for customer in customers:
        customer_id = customer["_id"]
        current_status = customer.get("status", "active")
        user_name = customer.get("user_name", "未知客户")

        try:
            # 检查是否已经是新状态体系
            if current_status in ["prospect", "pending", "active", "suspended", "terminated"]:
                stats["already_migrated"] += 1
                print(f"[OK] 客户 '{user_name}' 已使用新状态: {current_status}")
                continue

            # 根据旧状态确定新状态
            new_status = None

            if current_status == "active":
                # 检查是否有生效的合同
                has_active_contract = contracts_collection.count_documents({
                    "customer_id": str(customer_id),
                    "status": "effective"
                }) > 0

                if has_active_contract:
                    new_status = "active"  # 执行中
                    stats["active_to_active"] += 1
                    print(f"[->] 客户 '{user_name}': active (有生效合同) -> active (执行中)")
                else:
                    new_status = "prospect"  # 意向客户
                    stats["active_to_prospect"] += 1
                    print(f"[->] 客户 '{user_name}': active (无生效合同) -> prospect (意向客户)")

            elif current_status == "inactive":
                new_status = "suspended"  # 已暂停
                stats["inactive_to_suspended"] += 1
                print(f"[->] 客户 '{user_name}': inactive -> suspended (已暂停)")

            elif current_status == "deleted":
                new_status = "terminated"  # 已终止
                stats["deleted_to_terminated"] += 1
                print(f"[->] 客户 '{user_name}': deleted -> terminated (已终止)")

            else:
                print(f"[WARN] 客户 '{user_name}' 的状态 '{current_status}' 无法识别，跳过")
                continue

            # 更新数据库
            if new_status:
                customers_collection.update_one(
                    {"_id": customer_id},
                    {
                        "$set": {
                            "status": new_status,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )

        except Exception as e:
            stats["errors"] += 1
            print(f"[ERROR] 客户 '{user_name}' 迁移失败: {str(e)}")

    # 打印统计信息
    print("-" * 80)
    print("\n迁移完成！统计信息：")
    print(f"总客户数: {stats['total']}")
    print(f"已使用新状态: {stats['already_migrated']}")
    print(f"active → active (执行中): {stats['active_to_active']}")
    print(f"active → prospect (意向客户): {stats['active_to_prospect']}")
    print(f"inactive → suspended (已暂停): {stats['inactive_to_suspended']}")
    print(f"deleted → terminated (已终止): {stats['deleted_to_terminated']}")
    print(f"错误数: {stats['errors']}")

    return stats


if __name__ == "__main__":
    print("=" * 80)
    print("客户状态迁移脚本")
    print("=" * 80)
    print()

    # 确认提示
    response = input("是否开始迁移客户状态？(yes/no): ")
    if response.lower() != "yes":
        print("已取消迁移")
        sys.exit(0)

    print()
    migrate_customer_status()
    print()
    print("=" * 80)
