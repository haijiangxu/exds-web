# MongoDB索引管理脚本

## 索引创建脚本说明

### 文件：`create_retail_package_indexes.js`

此脚本为零售套餐管理模块创建必要的数据库索引，包括：

1. **唯一索引**（最重要）：
   - `package_name` - 确保套餐名称唯一性

2. **查询优化索引**：
   - `status` - 优化状态筛选查询
   - `package_type` - 优化套餐类型筛选
   - `created_at` - 优化时间排序
   - 复合索引：`status + package_type + created_at` - 优化多条件查询

---

## 执行方法

### 方法1：使用MongoDB Shell直接执行

```bash
# 1. 连接到MongoDB数据库
mongosh "mongodb://localhost:27017/exds_database"

# 2. 在Shell中执行脚本
load("webapp/scripts/create_retail_package_indexes.js")
```

### 方法2：使用命令行管道执行

```bash
mongosh "mongodb://localhost:27017/exds_database" < webapp/scripts/create_retail_package_indexes.js
```

### 方法3：使用Python脚本执行（推荐用于生产环境）

如果使用Python脚本管理索引，可以在项目中添加如下代码：

```python
from webapp.tools.mongo import DATABASE

def create_indexes():
    """创建retail_packages集合的所有索引"""
    collection = DATABASE.retail_packages

    # 1. 创建唯一索引
    collection.create_index(
        [("package_name", 1)],
        unique=True,
        name="idx_package_name_unique"
    )
    print("✓ 唯一索引创建成功: package_name")

    # 2. 创建查询优化索引
    collection.create_index([("status", 1)], name="idx_status")
    collection.create_index([("package_type", 1)], name="idx_package_type")
    collection.create_index([("created_at", -1)], name="idx_created_at")
    collection.create_index(
        [("status", 1), ("package_type", 1), ("created_at", -1)],
        name="idx_status_type_created"
    )
    print("✓ 所有索引创建成功")

if __name__ == "__main__":
    create_indexes()
```

---

## 验证索引

执行完索引创建后，可以使用以下命令验证：

```javascript
// 列出所有索引
db.retail_packages.getIndexes()

// 查看索引统计
db.retail_packages.stats().indexSizes
```

---

## 重要注意事项

### ⚠️ 创建唯一索引前的准备工作

在创建 `package_name` 唯一索引之前，**必须**确保数据库中没有重复的套餐名称，否则索引创建会失败。

#### 检查是否有重复名称

```javascript
db.retail_packages.aggregate([
    {
        $group: {
            _id: "$package_name",
            count: { $sum: 1 }
        }
    },
    {
        $match: {
            count: { $gt: 1 }
        }
    }
])
```

#### 如果发现重复，清理数据

```javascript
// 方法1：删除重复的记录（保留最早创建的）
db.retail_packages.aggregate([
    {
        $group: {
            _id: "$package_name",
            docs: { $push: { id: "$_id", created: "$created_at" } },
            count: { $sum: 1 }
        }
    },
    {
        $match: { count: { $gt: 1 } }
    }
]).forEach(doc => {
    // 保留最早创建的，删除其他
    const sorted = doc.docs.sort((a, b) => a.created - b.created);
    for (let i = 1; i < sorted.length; i++) {
        db.retail_packages.deleteOne({ _id: sorted[i].id });
    }
});

// 方法2：手动重命名重复的套餐
db.retail_packages.find({ package_name: "重复的名称" }).forEach((doc, index) => {
    if (index > 0) {
        db.retail_packages.updateOne(
            { _id: doc._id },
            { $set: { package_name: `${doc.package_name}_${index}` } }
        );
    }
});
```

---

## 索引性能影响

### 优点
- ✅ 大幅提升查询性能（特别是分页和筛选）
- ✅ 保证数据完整性（唯一索引）
- ✅ 优化排序操作

### 缺点
- ⚠️ 轻微影响写入性能（插入/更新/删除时需要维护索引）
- ⚠️ 增加存储空间占用（通常可忽略）

### 建议
- 在**开发环境**中先测试索引创建
- 在**生产环境**中，建议在**低峰期**创建索引
- 对于大数据量集合，建议使用 `background: true` 选项（脚本中已默认关闭）

---

## 删除索引（慎用）

如果需要删除索引：

```javascript
// 删除单个索引
db.retail_packages.dropIndex("idx_package_name_unique")

// 删除所有索引（除了_id索引）
db.retail_packages.dropIndexes()
```

⚠️ **警告**：删除唯一索引后，应用程序的数据完整性依赖项将失效！

---

## 故障排查

### 问题1：索引创建失败 - "duplicate key error"

**原因**：数据中存在重复的 `package_name`

**解决**：参见上文"检查是否有重复名称"部分

### 问题2：索引创建后查询仍然很慢

**原因**：索引可能未被使用

**解决**：使用 `explain()` 分析查询计划

```javascript
db.retail_packages.find({ status: "active" }).explain("executionStats")
```

### 问题3：写入性能下降

**原因**：索引过多或不合理

**解决**：删除不常用的索引，保留核心索引即可

---

## 相关文档

- [MongoDB索引最佳实践](https://www.mongodb.com/docs/manual/indexes/)
- [零售套餐管理模块设计方案](../../docs/pages/零售套餐管理模块设计方案_v2.md)
- [代码审查与完善方案](../../docs/pages/零售套餐管理模块代码审查与完善方案.md)
