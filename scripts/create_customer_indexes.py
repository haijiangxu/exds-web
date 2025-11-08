#!/usr/bin/env python3
"""
客户档案管理模块数据库索引创建脚本

此脚本用于为customers集合创建必要的索引以优化查询性能
"""

import sys
import os

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'webapp'))

from webapp.tools.mongo import DATABASE


def create_customer_indexes():
    """为客户管理模块创建数据库索引"""

    collection = DATABASE['customers']

    # 要创建的索引列表
    indexes = [
        # 1. 基础查询索引
        {
            'keys': [('user_name', 1)],
            'options': {'name': 'idx_user_name'},
            'description': '客户全称索引（用于精确查询和唯一性检查）'
        },
        {
            'keys': [('short_name', 1)],
            'options': {'name': 'idx_short_name'},
            'description': '客户简称索引'
        },
        {
            'keys': [('status', 1)],
            'options': {'name': 'idx_status'},
            'description': '状态索引（用于过滤已删除记录）'
        },

        # 2. 组合查询索引（用于列表筛选）
        {
            'keys': [('status', 1), ('created_at', -1)],
            'options': {'name': 'idx_status_created_at'},
            'description': '状态+创建时间组合索引（用于列表查询）'
        },
        {
            'keys': [('status', 1), ('user_type', 1), ('created_at', -1)],
            'options': {'name': 'idx_status_user_type'},
            'description': '状态+客户类型组合索引（用于按类型筛选）'
        },
        {
            'keys': [('status', 1), ('industry', 1), ('created_at', -1)],
            'options': {'name': 'idx_status_industry'},
            'description': '状态+行业组合索引（用于按行业筛选）'
        },
        {
            'keys': [('status', 1), ('region', 1), ('created_at', -1)],
            'options': {'name': 'idx_status_region'},
            'description': '状态+地区组合索引（用于按地区筛选）'
        },
        {
            'keys': [('status', 1), ('voltage', 1), ('created_at', -1)],
            'options': {'name': 'idx_status_voltage'},
            'description': '状态+电压等级组合索引（用于按电压筛选）'
        },

        # 3. 搜索索引
        {
            'keys': [('user_name', 'text'), ('short_name', 'text')],
            'options': {'name': 'idx_search_text', 'default_language': 'none'},
            'description': '全文搜索索引（用于客户名称搜索）'
        },

        # 4. 嵌套数据索引（用于户号和计量点查询）
        {
            'keys': [('utility_accounts.account_id', 1)],
            'options': {'name': 'idx_account_id'},
            'description': '户号ID索引（用于户号唯一性检查）'
        },
        {
            'keys': [('utility_accounts.metering_points.metering_point_id', 1)],
            'options': {'name': 'idx_metering_point_id'},
            'description': '计量点ID索引（用于计量点唯一性检查）'
        },
        {
            'keys': [('utility_accounts.metering_points.meter.meter_id', 1)],
            'options': {'name': 'idx_meter_id'},
            'description': '电表资产号索引（用于电表信息查询和同步更新）'
        },

        # 5. 时间索引
        {
            'keys': [('created_at', -1)],
            'options': {'name': 'idx_created_at'},
            'description': '创建时间索引（用于排序）'
        },
        {
            'keys': [('updated_at', -1)],
            'options': {'name': 'idx_updated_at'},
            'description': '更新时间索引（用于排序）'
        },

        # 6. 操作人索引
        {
            'keys': [('created_by', 1)],
            'options': {'name': 'idx_created_by'},
            'description': '创建人索引'
        },
        {
            'keys': [('updated_by', 1)],
            'options': {'name': 'idx_updated_by'},
            'description': '更新人索引'
        }
    ]

    print("开始创建客户档案管理模块索引...")

    created_count = 0
    existing_count = 0
    error_count = 0

    for index_info in indexes:
        try:
            # 检查索引是否已存在
            existing_indexes = collection.list_indexes()
            index_exists = any(idx.get('name') == index_info['options']['name'] for idx in existing_indexes)

            if index_exists:
                print(f"✅ 索引 '{index_info['options']['name']}' 已存在")
                existing_count += 1
                continue

            # 创建索引
            collection.create_index(
                keys=index_info['keys'],
                **index_info['options']
            )

            print(f"✅ 创建索引: {index_info['description']}")
            created_count += 1

        except Exception as e:
            print(f"❌ 创建索引失败: {index_info['description']}")
            print(f"   错误: {str(e)}")
            error_count += 1

    print(f"\n索引创建完成!")
    print(f"✅ 新建索引: {created_count}")
    print(f"✅ 已有索引: {existing_count}")
    print(f"❌ 失败索引: {error_count}")

    # 显示所有现有索引
    print(f"\n当前 {collection.name} 集合的所有索引:")
    try:
        all_indexes = list(collection.list_indexes())
        for idx in all_indexes:
            key_info = ', '.join([f"{field}: {direction}" for field, direction in idx['key']])
            print(f"  - {idx['name']}: ({key_info})")
    except Exception as e:
        print(f"获取索引列表失败: {str(e)}")


def drop_customer_indexes():
    """删除客户档案管理模块的所有索引（除了_id索引）"""

    collection = DATABASE['customers']

    print("开始删除客户档案管理模块索引...")

    try:
        # 获取所有现有索引
        existing_indexes = list(collection.list_indexes())

        dropped_count = 0
        error_count = 0

        for idx in existing_indexes:
            index_name = idx['name']

            # 保留 _id 索引
            if index_name == '_id_':
                continue

            try:
                collection.drop_index(index_name)
                print(f"✅ 删除索引: {index_name}")
                dropped_count += 1
            except Exception as e:
                print(f"❌ 删除索引失败 '{index_name}': {str(e)}")
                error_count += 1

        print(f"\n索引删除完成!")
        print(f"✅ 删除索引: {dropped_count}")
        print(f"❌ 失败索引: {error_count}")

    except Exception as e:
        print(f"获取索引列表失败: {str(e)}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == '--drop':
        drop_customer_indexes()
    else:
        create_customer_indexes()