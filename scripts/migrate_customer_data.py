"""
客户数据迁移脚本

将现有的 user_profiles、meters、measure_point 集合中的数据迁移到新的 customers 集合中
基于 user_hierarchy_final.json 中的层级关系数据
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from webapp.tools.mongo import DATABASE


def migrate_customer_data():
    """迁移客户数据到新的customers集合"""

    print("开始客户数据迁移...")

    # 1. 读取用户层级关系数据
    try:
        hierarchy_file = project_root / "docs" / "pages" / "客户档案管理" / "user_hierarchy_final.json"
        with open(hierarchy_file, 'r', encoding='utf-8') as f:
            user_hierarchy = json.load(f)
        print(f"[OK] 读取用户层级关系数据: {len(user_hierarchy)} 个用户")
    except Exception as e:
        print(f"✗ 读取用户层级关系数据失败: {e}")
        return

    # 2. 获取用户档案数据
    try:
        user_profiles = list(DATABASE['user_profiles'].find({}))
        profiles_dict = {profile['user_name']: profile for profile in user_profiles}
        print(f"✓ 读取用户档案数据: {len(profiles_dict)} 个档案")
    except Exception as e:
        print(f"✗ 读取用户档案数据失败: {e}")
        return

    # 3. 获取电表数据
    try:
        meters = list(DATABASE['meters'].find({}))
        meters_dict = {meter['_id']: meter for meter in meters}
        print(f"✓ 读取电表数据: {len(meters_dict)} 个电表")
    except Exception as e:
        print(f"✗ 读取电表数据失败: {e}")
        return

    # 4. 获取计量点数据
    try:
        measure_points = list(DATABASE['measure_point'].find({}))
        measure_points_dict = {mp['_id']: mp for mp in measure_points}
        print(f"✓ 读取计量点数据: {len(measure_points_dict)} 个计量点")
    except Exception as e:
        print(f"✗ 读取计量点数据失败: {e}")
        return

    # 5. 构建客户数据
    customers = []
    skipped_count = 0

    for user_data in user_hierarchy:
        user_name = user_data['user_name']
        profile = profiles_dict.get(user_name, {})

        # 构建客户基本信息
        customer = {
            'user_name': user_name,
            'short_name': profile.get('short_name', user_name[:10]),
            'user_type': profile.get('user_type', '标准工商业'),
            'industry': profile.get('industry', ''),
            'voltage': profile.get('voltage', ''),
            'region': profile.get('region', ''),
            'district': profile.get('district', ''),
            'address': profile.get('address', ''),
            'location': profile.get('location'),

            # 联系信息 - 暂时为空，后续可手动补充
            'contact_person': '',
            'contact_phone': '',
            'contact_email': '',
            'billing_contact': '',
            'billing_phone': '',
            'billing_email': '',
            'tax_number': '',

            # 状态和审计字段
            'status': 'active',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'created_by': 'system_migration',
            'updated_by': 'system_migration',

            # 户号信息
            'utility_accounts': []
        }

        # 构建户号和计量点信息
        for account_data in user_data['utility_accounts']:
            account_id = account_data['account_id']

            utility_account = {
                'account_id': account_id,
                'account_name': '',  # 暂时为空
                'account_type': '',  # 暂时为空
                'billing_cycle': '',  # 暂时为空
                'metering_points': []
            }

            for mp_data in account_data['metering_points']:
                metering_point_id = mp_data['metering_point_id']
                meter_id = mp_data['meter_id']

                # 获取电表信息
                meter_info = meters_dict.get(meter_id, {})

                metering_point = {
                    'metering_point_id': metering_point_id,
                    'allocation_percentage': mp_data['allocation_percentage'],
                    'point_type': '',  # 暂时为空
                    'location_description': '',  # 暂时为空
                    'meter': {
                        'meter_id': meter_id,
                        'multiplier': meter_info.get('multiplier', 1.0),
                        'meter_type': meter_info.get('meter_type', ''),
                        'installation_date': meter_info.get('installation_date', ''),
                        'status': 'active'
                    }
                }

                utility_account['metering_points'].append(metering_point)

            customer['utility_accounts'].append(utility_account)

        customers.append(customer)

    print(f"✓ 构建客户数据: {len(customers)} 个客户")

    # 6. 检查是否已存在customers集合
    existing_count = DATABASE['customers'].count_documents({})
    if existing_count > 0:
        print(f"⚠ customers集合已存在 {existing_count} 条记录")
        choice = input("是否清空现有数据并重新迁移? (y/N): ").strip().lower()
        if choice == 'y':
            DATABASE['customers'].delete_many({})
            print("✓ 已清空customers集合")
        else:
            print("取消迁移操作")
            return

    # 7. 插入到customers集合
    try:
        if customers:
            result = DATABASE['customers'].insert_many(customers)
            print(f"✓ 成功迁移 {len(result.inserted_ids)} 个客户数据")

            # 显示迁移统计
            print("\n迁移统计:")
            print(f"- 用户层级数据: {len(user_hierarchy)} 个")
            print(f"- 用户档案数据: {len(profiles_dict)} 个")
            print(f"- 电表数据: {len(meters_dict)} 个")
            print(f"- 计量点数据: {len(measure_points_dict)} 个")
            print(f"- 成功迁移客户: {len(customers)} 个")

            # 计算总户号和计量点数量
            total_accounts = sum(len(c['utility_accounts']) for c in customers)
            total_metering_points = sum(
                len(acc['metering_points'])
                for c in customers
                for acc in c['utility_accounts']
            )
            print(f"- 总户号数量: {total_accounts} 个")
            print(f"- 总计量点数量: {total_metering_points} 个")

        else:
            print("✗ 没有找到需要迁移的数据")
    except Exception as e:
        print(f"✗ 数据迁移失败: {e}")
        return

    print("\n数据迁移完成！")


def verify_migration():
    """验证迁移结果"""
    print("\n开始验证迁移结果...")

    try:
        # 检查customers集合中的数据
        customers_count = DATABASE['customers'].count_documents({})
        print(f"✓ customers集合中的客户数量: {customers_count}")

        if customers_count > 0:
            # 显示前几个客户的基本信息
            sample_customers = list(DATABASE['customers'].find({}).limit(5))
            print("\n样本客户数据:")
            for i, customer in enumerate(sample_customers, 1):
                print(f"{i}. {customer['user_name']}")
                print(f"   户号数量: {len(customer['utility_accounts'])}")
                total_mps = sum(len(acc['metering_points']) for acc in customer['utility_accounts'])
                print(f"   计量点数量: {total_mps}")
                print()

        print("✓ 迁移验证完成")

    except Exception as e:
        print(f"✗ 验证失败: {e}")


if __name__ == "__main__":
    print("=" * 50)
    print("客户档案数据迁移脚本")
    print("=" * 50)

    # 执行迁移
    migrate_customer_data()

    # 验证结果
    verify_migration()

    print("\n迁移脚本执行完成！")