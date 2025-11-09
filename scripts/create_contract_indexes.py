"""
创建零售合同集合的数据库索引

此脚本可以独立运行以确保索引存在。
注意：ContractService 的 _ensure_indexes() 方法会在服务启动时自动创建索引，
因此通常不需要手动运行此脚本。
"""

from webapp.tools.mongo import DATABASE


def create_indexes():
    """创建合同集合的索引"""
    collection = DATABASE["retail_contracts"]

    print("开始创建零售合同集合的索引...")

    # 索引配置
    indexes = [
        # 1. 基础查询索引
        ([('package_name', 1)], {'name': 'idx_package_name'}),
        ([('customer_name', 1)], {'name': 'idx_customer_name'}),
        ([('purchase_start_month', 1)], {'name': 'idx_purchase_start_month'}),
        ([('purchase_end_month', 1)], {'name': 'idx_purchase_end_month'}),

        # 2. 关联查询索引
        ([('package_id', 1)], {'name': 'idx_package_id'}),
        ([('customer_id', 1)], {'name': 'idx_customer_id'}),

        # 3. 组合查询索引（优化筛选查询）
        ([('package_name', 1), ('purchase_start_month', -1)],
         {'name': 'idx_package_start'}),
        ([('customer_name', 1), ('purchase_start_month', -1)],
         {'name': 'idx_customer_start'}),

        # 4. 时间索引
        ([('created_at', -1)], {'name': 'idx_created_at'}),
        ([('updated_at', -1)], {'name': 'idx_updated_at'}),
    ]

    # 获取现有索引
    existing_indexes = {idx.get('name') for idx in collection.list_indexes()}

    # 创建索引
    created_count = 0
    for keys, options in indexes:
        index_name = options['name']
        if index_name in existing_indexes:
            print(f"  ✓ 索引 '{index_name}' 已存在，跳过创建")
        else:
            collection.create_index(keys, **options)
            print(f"  ✓ 创建索引 '{index_name}' 成功")
            created_count += 1

    print(f"\n索引创建完成！共创建 {created_count} 个新索引。")
    print(f"总索引数量：{len(list(collection.list_indexes()))}")


if __name__ == "__main__":
    create_indexes()
