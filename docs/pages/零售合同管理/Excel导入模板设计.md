# 零售合同管理 - Excel导入模板设计

## 一、导入模板规范

### 1.1 Excel文件格式

**文件来源**：交易中心平台下载的标准格式文件

**文件要求**：
- 文件格式：Excel (.xlsx 或 .xls)
- 文件大小：建议不超过10MB
- 编码格式：UTF-8
- 表格结构：必须包含表头行
- **注意**：不提供模板下载功能，直接处理交易中心标准格式

### 1.2 必需字段定义

| 序号 | Excel列名 | 数据类型 | 必填 | 示例 | 说明 |
|------|-----------|---------|------|------|------|
| 1 | 序号 | 数字 | 否 | 1 | 仅用于Excel内排序，系统忽略 |
| 2 | 套餐 | 文本 | 是 | 2024年商业尖峰平谷套餐 | 系统内套餐名称，支持模糊匹配 |
| 3 | 代理销售费模型 | 文本 | 否 | 标准模式 | **系统忽略**，仅用于Excel记录 |
| 4 | 购买用户 | 文本 | 是 | 丰城超胜塑业有限公司 | 客户档案中的用户名称 |
| 5 | 购买电量 | 数字 | 是 | 100000 | 单位：kWh，必须大于0 |
| 6 | 购买时间-开始 | 日期 | 是 | 2024-01 或 2024-01-01 | 购电开始月份 |
| 7 | 购买时间-结束 | 日期 | 是 | 2024-12 或 2024-12-01 | 购电结束月份 |
| 8 | 签章状态 | 文本 | 否 | 已签章 | **系统忽略**，仅用于Excel记录 |

### 1.3 Excel文件示例格式

**交易中心标准格式**：

```
序号 | 套餐 | 代理销售费模型 | 购买用户 | 购买电量 | 购买时间-开始 | 购买时间-结束 | 签章状态
1    | 2024年商业尖峰平谷套餐 | 标准模式 | 丰城超胜塑业有限公司 | 100000 | 2024-01 | 2024-12 | 已签章
2    | 2024年居民分时套餐 | 基础模式 | 测试电力有限公司 | 50000 | 2024-06 | 2024-12 | 已签章
```

**处理说明**：
1. 直接处理交易中心下载的标准Excel文件
2. 必填字段：套餐、购买用户、购买电量、购买时间-开始、购买时间-结束
3. 忽略字段：序号、代理销售费模型、签章状态（系统不存储这些信息）
4. 日期格式支持：YYYY-MM、YYYY-MM-DD、YYYY/MM、YYYY/MM/DD
5. 购买电量必须为正数
6. 套餐和购买用户必须在系统中存在
7. 购买时间-结束必须 >= 购买时间-开始

## 二、数据校验规则详解

### 2.1 基础校验

**必填项检查**：
```python
required_fields = ['套餐', '购买用户', '购买电量', '购买时间-开始', '购买时间-结束']

def validate_required_fields(row):
    errors = []
    for field in required_fields:
        if pd.isna(row[field]) or str(row[field]).strip() == '':
            errors.append({
                'field': field,
                'message': '不能为空',
                'suggestion': '请填写有效的' + field
            })
    return errors
```

**数据类型检查**：
```python
def validate_data_types(row):
    errors = []

    # 购买电量必须是数字且大于0
    try:
        quantity = float(row['购买电量'])
        if quantity <= 0:
            errors.append({
                'field': '购买电量',
                'message': '必须大于0',
                'suggestion': '请输入大于0的数字'
            })
    except (ValueError, TypeError):
        errors.append({
            'field': '购买电量',
            'message': '格式错误，必须为数字',
            'suggestion': '请输入有效的数字，如：100000'
        })

    return errors
```

### 2.2 日期格式校验

**支持的日期格式**：
- `YYYY-MM`：2024-01
- `YYYY-MM-DD`：2024-01-01
- `YYYY/MM`：2024/01
- `YYYY/MM/DD`：2024/01/01

**日期解析函数**：
```python
def parse_date_field(date_value, field_name):
    """
    解析日期字段为datetime对象（每月1号）

    Args:
        date_value: 日期值（各种格式）
        field_name: 字段名称，用于错误提示

    Returns:
        datetime: 解析后的日期对象

    Raises:
        ValueError: 日期格式不正确时抛出
    """
    if pd.isna(date_value):
        raise ValueError(f"{field_name}不能为空")

    # 如果已经是datetime对象
    if isinstance(date_value, datetime):
        return datetime(date_value.year, date_value.month, 1)

    # 处理Excel的Timestamp对象
    if hasattr(date_value, 'date'):
        date_value = date_value.date()

    # 转换为字符串处理
    date_str = str(date_value).strip()

    # 尝试多种日期格式
    formats = [
        "%Y-%m-%d",  # 2024-01-01
        "%Y-%m",     # 2024-01
        "%Y/%m/%d",  # 2024/01/01
        "%Y/%m",     # 2024/01
        "%Y年%m月",  # 2024年01月
        "%Y年%m月%d日"  # 2024年01月01日
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return datetime(dt.year, dt.month, 1)  # 统一为每月1号
        except ValueError:
            continue

    raise ValueError(f"无法解析日期格式：{date_str}")
```

### 2.3 关联数据校验

**套餐存在性校验**：
```python
def validate_package_exists(package_name):
    """
    校验套餐是否存在且状态为激活

    Args:
        package_name: 套餐名称

    Returns:
        tuple: (is_valid, package_info_or_error_message)
    """
    if not package_name or str(package_name).strip() == '':
        return False, "套餐名称不能为空"

    # 支持模糊匹配
    package = DATABASE.retail_packages.find_one({
        "package_name": {"$regex": package_name, "$options": "i"},
        "status": "active"
    })

    if package:
        return True, package
    else:
        # 尝试精确匹配
        exact_package = DATABASE.retail_packages.find_one({
            "package_name": package_name,
            "status": "active"
        })
        if exact_package:
            return True, exact_package
        else:
            return False, f"套餐'{package_name}'不存在或未生效"
```

**客户存在性校验**：
```python
def validate_customer_exists(customer_name):
    """
    校验客户是否存在且状态为正常

    Args:
        customer_name: 客户名称

    Returns:
        tuple: (is_valid, customer_info_or_error_message)
    """
    if not customer_name or str(customer_name).strip() == '':
        return False, "客户名称不能为空"

    # 优先使用user_name字段精确匹配
    customer = DATABASE.customers.find_one({
        "user_name": customer_name,
        "status": "active"
    })

    if customer:
        return True, customer
    else:
        # 如果user_name匹配不到，尝试company_name字段
        customer = DATABASE.customers.find_one({
            "company_name": customer_name,
            "status": "active"
        })

        if customer:
            return True, customer
        else:
            return False, f"客户'{customer_name}'不存在或状态非正常"
```

### 2.4 业务逻辑校验

**日期范围校验**：
```python
def validate_date_range(start_date, end_date):
    """
    校验购电时间范围是否合理

    Args:
        start_date: 开始日期
        end_date: 结束日期

    Returns:
        tuple: (is_valid, error_message)
    """
    if end_date < start_date:
        return False, "购电结束时间不能早于开始时间"

    # 检查时间跨度是否合理（不超过5年）
    months_diff = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month)
    if months_diff > 60:
        return False, "购电时间跨度不能超过5年"

    return True, ""
```

**合同重复性校验**：
```python
def validate_contract_uniqueness(customer_id, start_date, end_date, exclude_contract_id=None):
    """
    校验同一客户在相同时间段是否有重复合同

    Args:
        customer_id: 客户ID
        start_date: 开始日期
        end_date: 结束日期
        exclude_contract_id: 排除的合同ID（用于更新时）

    Returns:
        tuple: (is_valid, error_message)
    """
    query = {
        "customer_id": customer_id,
        "$or": [
            {"purchase_start_month": {"$lte": start_date}, "purchase_end_month": {"$gte": start_date}},
            {"purchase_start_month": {"$lte": end_date}, "purchase_end_month": {"$gte": end_date}},
            {"purchase_start_month": {"$gte": start_date}, "purchase_end_month": {"$lte": end_date}},
            {"purchase_start_month": {"$lte": start_date}, "purchase_end_month": {"$gte": end_date}}
        ]
    }

    # 排除指定合同（更新时使用）
    if exclude_contract_id:
        query["_id"] = {"$ne": ObjectId(exclude_contract_id)}

    existing_contract = DATABASE.retail_contracts.find_one(query)

    if existing_contract:
        return False, f"该客户在指定时间段已存在合同（合同号：{existing_contract.get('contract_name', '未知')}）"

    return True, ""
```

## 三、数据转换和处理逻辑

### 3.1 字段映射转换

**Excel字段到系统字段映射**：
```python
FIELD_MAPPING = {
    '套餐': 'package_name',
    '购买用户': 'customer_name',
    '购买电量': 'purchasing_electricity_quantity',
    '购买时间-开始': 'purchase_start_month',
    '购买时间-结束': 'purchase_end_month'
}

IGNORED_FIELDS = ['序号', '代理销售费模型', '签章状态']
```

**数据转换函数**：
```python
def transform_row_to_contract(row, row_number, operator):
    """
    将Excel行数据转换为合同数据格式

    Args:
        row: Excel行数据
        row_number: 行号（用于错误定位）
        operator: 操作人

    Returns:
        dict: 转换后的合同数据

    Raises:
        ValueError: 数据转换失败时抛出
    """
    # 1. 基础字段转换
    contract_data = {}

    # 必填字段转换
    contract_data['package_name'] = str(row['套餐']).strip()
    contract_data['customer_name'] = str(row['购买用户']).strip()
    contract_data['purchasing_electricity_quantity'] = float(row['购买电量'])

    # 日期字段转换
    contract_data['purchase_start_month'] = parse_date_field(row['购买时间-开始'], '购买时间-开始')
    contract_data['purchase_end_month'] = parse_date_field(row['购买时间-结束'], '购买时间-结束')

    # 2. 查询关联数据ID
    package_valid, package_info = validate_package_exists(contract_data['package_name'])
    if not package_valid:
        raise ValueError(package_info)
    contract_data['package_id'] = str(package_info['_id'])

    customer_valid, customer_info = validate_customer_exists(contract_data['customer_name'])
    if not customer_valid:
        raise ValueError(customer_info)
    contract_data['customer_id'] = str(customer_info['_id'])

    # 3. 生成合同名称
    contract_data['contract_name'] = generate_contract_name(
        contract_data['customer_id'],
        contract_data['purchase_start_month']
    )

    # 4. 添加审计字段
    now = datetime.utcnow()
    contract_data.update({
        'created_by': operator,
        'created_at': now,
        'updated_by': operator,
        'updated_at': now
    })

    return contract_data
```

### 3.2 合同名称生成逻辑

**生成规则**：`客户简称 + 购电开始年月(YYYYMM)`

```python
def generate_contract_name(customer_id, purchase_start_month):
    """
    自动生成合同名称

    Args:
        customer_id: 客户ID
        purchase_start_month: 购电开始月份

    Returns:
        str: 生成的合同名称
    """
    # 获取客户信息
    customer = DATABASE.customers.find_one({
        "_id": ObjectId(customer_id),
        "status": "active"
    })

    if not customer:
        short_name = "客户"
    else:
        # 优先使用简称
        short_name = customer.get('short_name')
        if not short_name:
            # 使用客户名称前4个字符
            customer_name = customer.get('user_name', customer.get('company_name', ''))
            short_name = customer_name[:4] if customer_name else "客户"

    # 生成年月字符串
    year_month_str = purchase_start_month.strftime("%Y%m")

    return f"{short_name}{year_month_str}"
```

## 四、批量处理逻辑

### 4.1 导入处理流程

```python
async def process_excel_import(file_content, operator):
    """
    处理Excel导入的主流程

    Args:
        file_content: Excel文件内容
        operator: 操作人

    Returns:
        dict: 导入结果统计
    """
    try:
        # 1. 读取Excel文件
        df = pd.read_excel(io.BytesIO(file_content))

        # 2. 验证文件结构
        validate_excel_structure(df)

        # 3. 初始化统计
        stats = {
            'total': len(df),
            'success': 0,
            'failed': 0,
            'errors': []
        }

        # 4. 逐行处理
        for index, row in df.iterrows():
            row_number = index + 2  # Excel行号（从2开始，因为有表头）

            try:
                # 数据校验和转换
                validation_errors = validate_row_data(row, row_number)
                if validation_errors:
                    stats['errors'].extend(validation_errors)
                    stats['failed'] += 1
                    continue

                # 转换数据格式
                contract_data = transform_row_to_contract(row, row_number, operator)

                # 插入数据库
                DATABASE.retail_contracts.insert_one(contract_data)
                stats['success'] += 1

            except Exception as e:
                error_info = {
                    'row': row_number,
                    'field': 'general',
                    'value': None,
                    'message': str(e),
                    'suggestion': '请检查该行数据的完整性和格式'
                }
                stats['errors'].append(error_info)
                stats['failed'] += 1

        return stats

    except Exception as e:
        raise ValueError(f"文件处理失败：{str(e)}")
```

### 4.2 性能优化策略

**内存优化**：
```python
# 使用流式读取，避免大文件内存溢出
def read_excel_in_chunks(file_content, chunk_size=100):
    """分块读取Excel文件"""
    df = pd.read_excel(io.BytesIO(file_content))
    for i in range(0, len(df), chunk_size):
        yield df.iloc[i:i + chunk_size]
```

**数据库优化**：
```python
# 批量插入优化
def batch_insert_contracts(contracts_data):
    """批量插入合同数据"""
    if contracts_data:
        DATABASE.retail_contracts.insert_many(contracts_data)
```

## 五、错误处理和反馈

### 5.1 错误分类和处理

| 错误类型 | 处理方式 | 用户提示 |
|---------|---------|---------|
| 文件格式错误 | 终止导入 | 请上传有效的Excel文件 |
| 缺少必填列 | 终止导入 | Excel文件缺少必需列：套餐、购买用户等 |
| 数据格式错误 | 记录错误，继续处理 | 第X行购买电量格式错误 |
| 关联数据不存在 | 记录错误，继续处理 | 第X行套餐不存在或未生效 |
| 业务逻辑错误 | 记录错误，继续处理 | 第X行购电结束时间早于开始时间 |

### 5.2 导入结果反馈格式

```json
{
  "success": true,
  "data": {
    "total": 100,
    "success": 85,
    "failed": 15,
    "errors": [
      {
        "row": 5,
        "field": "套餐",
        "value": "不存在的套餐",
        "message": "套餐不存在或未生效",
        "suggestion": "请检查套餐名称是否正确"
      },
      {
        "row": 8,
        "field": "购买电量",
        "value": -1000,
        "message": "必须大于0",
        "suggestion": "请输入大于0的数字"
      }
    ]
  }
}
```

### 5.3 前端错误展示

```typescript
// 错误列表组件
const ImportErrorList = ({ errors }: { errors: ImportError[] }) => (
  <TableContainer>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>行号</TableCell>
          <TableCell>字段</TableCell>
          <TableCell>错误值</TableCell>
          <TableCell>错误原因</TableCell>
          <TableCell>修改建议</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {errors.map((error, index) => (
          <TableRow key={index}>
            <TableCell>{error.row}</TableCell>
            <TableCell>{error.field}</TableCell>
            <TableCell>{error.value || '-'}</TableCell>
            <TableCell color="error">{error.message}</TableCell>
            <TableCell>{error.suggestion || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);
```

## 六、测试用例设计

### 6.1 正常用例

**用例1：标准数据导入**
```
序号,套餐,购买用户,购买电量,购买时间-开始,购买时间-结束
1,2024年商业尖峰平谷套餐,丰城超胜塑业有限公司,100000,2024-01,2024-12
```

**预期结果**：成功导入1条记录

### 6.2 异常用例

**用例2：套餐不存在**
```
序号,套餐,购买用户,购买电量,购买时间-开始,购买时间-结束
1,不存在的套餐,丰城超胜塑业有限公司,100000,2024-01,2024-12
```

**预期结果**：导入失败，错误提示"套餐不存在或未生效"

**用例3：日期格式错误**
```
序号,套餐,购买用户,购买电量,购买时间-开始,购买时间-结束
1,2024年商业尖峰平谷套餐,丰城超胜塑业有限公司,100000,2024-13-01,2024-12-01
```

**预期结果**：导入失败，错误提示"日期格式错误"

### 6.3 边界用例

**用例4：最大数据量**
- 创建1000行有效数据
- 预期结果：全部成功导入，处理时间 < 10秒

**用例5：空数据**
- 上传空Excel文件
- 预期结果：提示"文件中没有有效数据"

---

## 七、总结

本Excel导入模板设计充分考虑了业务需求和用户体验，通过完善的校验机制、友好的错误提示和高效的处理逻辑，为零售合同管理模块提供了可靠的批量数据导入能力。

**核心特点**：
1. **模板标准化**：提供标准Excel模板，降低用户使用门槛
2. **校验严格**：多层次校验确保数据质量
3. **错误友好**：详细的错误信息和修改建议
4. **性能优化**：支持大数据量的高效处理
5. **扩展性强**：支持未来的字段扩展和业务变化