/**
 * MongoDB索引创建脚本
 * 用途：为零售套餐管理模块创建必要的数据库索引
 *
 * 执行方法：
 * 1. 使用MongoDB Shell连接到数据库
 * 2. 执行：mongosh <数据库连接URL> < create_retail_package_indexes.js
 * 或者在MongoDB Shell中：load("create_retail_package_indexes.js")
 */

// 切换到目标数据库（请根据实际情况修改数据库名）
// use exds_database;

// 获取当前数据库
const db = db.getSiblingDB('exds_database'); // 修改为实际数据库名

print("开始创建零售套餐集合索引...");

// 1. 创建package_name唯一索引（最重要）
try {
    db.retail_packages.createIndex(
        { "package_name": 1 },
        {
            unique: true,
            name: "idx_package_name_unique",
            background: false
        }
    );
    print("✓ 成功创建唯一索引: idx_package_name_unique (package_name)");
} catch (e) {
    print("✗ 创建唯一索引失败: " + e.message);
    print("  可能原因：索引已存在或数据中有重复的套餐名称");
}

// 2. 创建status索引（优化状态筛选查询）
try {
    db.retail_packages.createIndex(
        { "status": 1 },
        {
            name: "idx_status",
            background: false
        }
    );
    print("✓ 成功创建索引: idx_status (status)");
} catch (e) {
    print("✗ 创建索引失败: " + e.message);
}

// 3. 创建package_type索引（优化套餐类型筛选）
try {
    db.retail_packages.createIndex(
        { "package_type": 1 },
        {
            name: "idx_package_type",
            background: false
        }
    );
    print("✓ 成功创建索引: idx_package_type (package_type)");
} catch (e) {
    print("✗ 创建索引失败: " + e.message);
}

// 4. 创建created_at索引（优化时间排序）
try {
    db.retail_packages.createIndex(
        { "created_at": -1 },
        {
            name: "idx_created_at",
            background: false
        }
    );
    print("✓ 成功创建索引: idx_created_at (created_at)");
} catch (e) {
    print("✗ 创建索引失败: " + e.message);
}

// 5. 创建复合索引（优化多条件查询）
try {
    db.retail_packages.createIndex(
        { "status": 1, "package_type": 1, "created_at": -1 },
        {
            name: "idx_status_type_created",
            background: false
        }
    );
    print("✓ 成功创建复合索引: idx_status_type_created");
} catch (e) {
    print("✗ 创建复合索引失败: " + e.message);
}

print("\n索引创建完成！正在列出所有索引...\n");

// 列出所有索引
const indexes = db.retail_packages.getIndexes();
printjson(indexes);

print("\n索引统计信息：");
print("总索引数量: " + indexes.length);

// 验证唯一索引
print("\n验证package_name唯一索引...");
const uniqueIndex = indexes.find(idx => idx.name === "idx_package_name_unique");
if (uniqueIndex && uniqueIndex.unique === true) {
    print("✓ package_name唯一索引已正确创建");
} else {
    print("✗ 警告：package_name唯一索引可能未正确创建");
}
