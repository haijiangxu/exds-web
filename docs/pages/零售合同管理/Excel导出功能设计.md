# 零售合同管理 - Excel导出功能设计

## 一、导出功能概述

### 1.1 功能目标

为零售合同管理模块提供灵活的数据导出功能，支持：
- 按条件筛选导出
- 多种数据格式输出
- 用户体验友好的文件下载
- 移动端兼容支持

### 1.2 导出场景

1. **全量导出**：导出所有合同数据
2. **筛选导出**：按套餐、客户、状态等条件筛选导出
3. **时间范围导出**：按购电时间范围导出
4. **当前页导出**：导出当前列表页显示的数据
5. **选中项导出**：导出用户勾选的合同记录

## 二、导出字段设计

### 2.1 标准导出字段

| 序号 | 字段名 | Excel列名 | 数据类型 | 格式 | 说明 |
|------|--------|-----------|---------|------|------|
| 1 | id | 合同编号 | 文本 | - | 系统生成的唯一标识 |
| 2 | contract_name | 合同名称 | 文本 | - | 客户简称+年月（如：恒力集团202401） |
| 3 | package_name | 套餐名称 | 文本 | - | 关联的零售套餐名称 |
| 4 | customer_name | 购买用户 | 文本 | - | 客户档案中的用户名称 |
| 5 | purchasing_electricity_quantity | 购买电量 | 数字 | #,##0.00 | 单位：kWh，千分位分隔 |
| 6 | purchase_start_month | 购电开始月份 | 日期 | YYYY-MM | 格式化为年月 |
| 7 | purchase_end_month | 购电结束月份 | 日期 | YYYY-MM | 格式化为年月 |
| 8 | status | 合同状态 | 文本 | - | 中文状态显示 |
| 9 | created_at | 创建时间 | 日期时间 | YYYY-MM-DD HH:MM:SS | 合同创建时间 |
| 10 | updated_at | 更新时间 | 日期时间 | YYYY-MM-DD HH:MM:SS | 合同最后更新时间 |

### 2.2 扩展字段（可选）

| 序号 | 字段名 | Excel列名 | 数据类型 | 说明 |
|------|--------|-----------|---------|------|
| 11 | package_type | 套餐类型 | 文本 | 分时段/不分时段 |
| 12 | pricing_mode | 定价模式 | 文本 | 固定+联动/价差分成 |
| 13 | is_green_power | 是否绿电 | 文本 | 是/否 |
| 14 | created_by | 创建人 | 文本 | 操作用户名 |
| 15 | contract_duration_months | 合同期限 | 数字 | 月数 |

### 2.3 字段格式化规则

**数字格式化**：
```python
def format_number(value, decimal_places=2):
    """格式化数字，添加千分位分隔符"""
    if value is None:
        return ""
    try:
        return f"{value:,.{decimal_places}f}"
    except:
        return str(value)
```

**日期格式化**：
```python
def format_datetime(dt, format_type='date'):
    """格式化日期时间"""
    if dt is None:
        return ""

    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))

    if format_type == 'date':
        return dt.strftime("%Y-%m")
    elif format_type == 'datetime':
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    else:
        return str(dt)
```

**状态格式化**：
```python
STATUS_MAPPING = {
    'pending': '待生效',
    'active': '生效',
    'expired': '已过期'
}

def format_status(status):
    """格式化合同状态为中文"""
    return STATUS_MAPPING.get(status, status)
```

## 三、筛选条件设计

### 3.1 筛选参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| package_name | string | 否 | 套餐名称（模糊搜索） | "商业" |
| customer_name | string | 否 | 客户名称（模糊搜索） | "恒力集团" |
| status | string | 否 | 合同状态 | "active" |
| start_month | string | 否 | 购电开始月份（>=） | "2024-01" |
| end_month | string | 否 | 购电结束月份（<=） | "2024-12" |
| min_quantity | number | 否 | 最小购买电量 | 10000 |
| max_quantity | number | 否 | 最大购买电量 | 1000000 |
| contract_ids | array | 否 | 指定合同ID列表 | ["id1", "id2"] |

### 3.2 筛选逻辑

```python
def build_export_query(params):
    """构建导出查询条件"""
    query = {}

    # 基础筛选条件
    if params.get('package_name'):
        query['package_name'] = {
            '$regex': params['package_name'],
            '$options': 'i'
        }

    if params.get('customer_name'):
        query['customer_name'] = {
            '$regex': params['customer_name'],
            '$options': 'i'
        }

    # 日期范围筛选
    if params.get('start_month'):
        query['purchase_start_month'] = {
            '$gte': params['start_month']
        }

    if params.get('end_month'):
        query['purchase_end_month'] = {
            '$lte': params['end_month']
        }

    # 电量范围筛选
    if params.get('min_quantity'):
        query['purchasing_electricity_quantity'] = {
            '$gte': float(params['min_quantity'])
        }

    if params.get('max_quantity'):
        if 'purchasing_electricity_quantity' in query:
            query['purchasing_electricity_quantity']['$lte'] = float(params['max_quantity'])
        else:
            query['purchasing_electricity_quantity'] = {
                '$lte': float(params['max_quantity'])
            }

    # 指定ID筛选
    if params.get('contract_ids'):
        query['_id'] = {
            '$in': [ObjectId(id) for id in params['contract_ids']]
        }

    return query
```

## 四、数据处理逻辑

### 4.1 数据查询流程

```python
async def export_contracts(params, current_user):
    """导出合同数据的主流程"""
    try:
        # 1. 构建查询条件
        query = build_export_query(params)

        # 2. 查询数据
        contracts = list(DATABASE.retail_contracts.find(query))

        # 3. 数据处理和格式化
        processed_data = []
        for contract in contracts:
            # 计算虚拟状态
            status = calculate_contract_status(
                contract.get('purchase_start_month'),
                contract.get('purchase_end_month')
            )

            # 应用状态筛选
            if params.get('status') and params['status'] != 'all':
                if status != params['status']:
                    continue

            # 格式化数据
            formatted_contract = format_contract_for_export(contract, status)
            processed_data.append(formatted_contract)

        # 4. 生成Excel文件
        excel_data = generate_excel_file(processed_data, params)

        return excel_data

    except Exception as e:
        raise ValueError(f"导出失败：{str(e)}")
```

### 4.2 数据格式化函数

```python
def format_contract_for_export(contract, status):
    """格式化单个合同数据用于导出"""

    # 基础字段格式化
    formatted = {
        '合同编号': str(contract.get('_id', '')),
        '合同名称': contract.get('contract_name', ''),
        '套餐名称': contract.get('package_name', ''),
        '购买用户': contract.get('customer_name', ''),
        '购买电量': format_number(contract.get('purchasing_electricity_quantity', 0)),
        '购电开始月份': format_datetime(contract.get('purchase_start_month'), 'date'),
        '购电结束月份': format_datetime(contract.get('purchase_end_month'), 'date'),
        '合同状态': format_status(status),
        '创建时间': format_datetime(contract.get('created_at'), 'datetime'),
        '更新时间': format_datetime(contract.get('updated_at'), 'datetime'),
    }

    # 扩展字段（如果存在）
    package_snapshot = contract.get('package_snapshot', {})
    if package_snapshot:
        formatted.update({
            '套餐类型': '分时段' if package_snapshot.get('package_type') == 'time_based' else '不分时段',
            '定价模式': '固定+联动' if package_snapshot.get('pricing_mode') == 'fixed_linked' else '价差分成',
            '是否绿电': '是' if package_snapshot.get('is_green_power') else '否'
        })

    formatted['创建人'] = contract.get('created_by', '')

    # 计算合同期限
    start_date = contract.get('purchase_start_month')
    end_date = contract.get('purchase_end_month')
    if start_date and end_date:
        months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month) + 1
        formatted['合同期限（月）'] = months
    else:
        formatted['合同期限（月）'] = ''

    return formatted
```

### 4.3 Excel文件生成

```python
def generate_excel_file(data, params):
    """生成Excel文件"""
    import pandas as pd
    import io
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils.dataframe import dataframe_to_rows

    # 创建DataFrame
    if not data:
        # 创建空表格带列名
        columns = [
            '合同编号', '合同名称', '套餐名称', '购买用户', '购买电量',
            '购电开始月份', '购电结束月份', '合同状态', '创建时间', '更新时间'
        ]
        df = pd.DataFrame(columns=columns)
    else:
        df = pd.DataFrame(data)

    # 创建Excel工作簿
    output = io.BytesIO()

    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='合同数据')

        # 获取工作表
        worksheet = writer.sheets['合同数据']

        # 设置样式
        _format_excel_worksheet(worksheet, df, params)

    output.seek(0)
    return output

def _format_excel_worksheet(worksheet, df, params):
    """格式化Excel工作表"""
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    # 设置标题行样式
    header_font = Font(name='微软雅黑', size=12, bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
    header_alignment = Alignment(horizontal='center', vertical='center')

    # 设置数据行样式
    data_font = Font(name='微软雅黑', size=10)
    data_alignment = Alignment(horizontal='left', vertical='center')

    # 设置边框
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    # 应用标题行样式
    for cell in worksheet[1]:
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border

    # 应用数据行样式
    for row in worksheet.iter_rows(min_row=2):
        for cell in row:
            cell.font = data_font
            cell.alignment = data_alignment
            cell.border = thin_border

            # 状态列颜色标记
            if cell.column_letter == 'H':  # 状态列
                if cell.value == '生效':
                    cell.fill = PatternFill(start_color='E8F5E8', end_color='E8F5E8', fill_type='solid')
                elif cell.value == '已过期':
                    cell.fill = PatternFill(start_color='FFF2E8', end_color='FFF2E8', fill_type='solid')
                elif cell.value == '待生效':
                    cell.fill = PatternFill(start_color='E8F4FF', end_color='E8F4FF', fill_type='solid')

    # 自动调整列宽
    for column in worksheet.columns:
        max_length = 0
        column_letter = column[0].column_letter

        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass

        adjusted_width = min(max_length + 2, 50)
        worksheet.column_dimensions[column_letter].width = adjusted_width

    # 冻结首行
    worksheet.freeze_panes = 'A2'

    # 添加筛选器
    worksheet.auto_filter.ref = f"A1:{get_column_letter(worksheet.max_column)}{worksheet.max_row}"

    # 添加页眉信息
    if not df.empty:
        # 在顶部添加筛选条件说明
        worksheet.insert_rows(1)
        worksheet.cell(row=1, column=1, value='导出条件：')

        filter_desc = _build_filter_description(params)
        worksheet.cell(row=1, column=2, value=filter_desc)

        # 合并单元格
        worksheet.merge_cells(f'B1:{get_column_letter(worksheet.max_column)}1')

        # 设置页眉样式
        header_cell = worksheet.cell(row=1, column=1)
        header_cell.font = Font(name='微软雅黑', size=10, bold=True)
        header_cell.alignment = Alignment(horizontal='left', vertical='center')

def _build_filter_description(params):
    """构建筛选条件描述"""
    descriptions = []

    if params.get('package_name'):
        descriptions.append(f"套餐名称：{params['package_name']}")

    if params.get('customer_name'):
        descriptions.append(f"客户名称：{params['customer_name']}")

    if params.get('status') and params['status'] != 'all':
        status_map = {'pending': '待生效', 'active': '生效', 'expired': '已过期'}
        descriptions.append(f"合同状态：{status_map.get(params['status'], params['status'])}")

    if params.get('start_month') or params.get('end_month'):
        start = params.get('start_month', '开始')
        end = params.get('end_month', '结束')
        descriptions.append(f"购电时间：{start} ~ {end}")

    if params.get('min_quantity') or params.get('max_quantity'):
        min_q = params.get('min_quantity', '0')
        max_q = params.get('max_quantity', '无限制')
        descriptions.append(f"购买电量：{min_q} ~ {max_q} kWh")

    return '；'.join(descriptions) if descriptions else '无筛选条件'
```

## 五、API接口设计

### 5.1 导出API端点

```python
@router.get("/export", summary="导出合同数据")
async def export_contracts(
    request: Request,
    package_name: Optional[str] = Query(None, description="套餐名称筛选"),
    customer_name: Optional[str] = Query(None, description="客户名称筛选"),
    status: Optional[str] = Query(None, description="合同状态筛选"),
    start_month: Optional[str] = Query(None, description="购电开始月份筛选(YYYY-MM)"),
    end_month: Optional[str] = Query(None, description="购电结束月份筛选(YYYY-MM)"),
    min_quantity: Optional[float] = Query(None, description="最小购买电量"),
    max_quantity: Optional[float] = Query(None, description="最大购买电量"),
    contract_ids: Optional[str] = Query(None, description="指定合同ID列表(逗号分隔)"),
    format_type: Optional[str] = Query("excel", description="导出格式"),
    current_user: User = Depends(get_current_active_user)
):
    """
    导出合同数据

    支持多种筛选条件和导出格式
    """
    try:
        # 构建参数字典
        params = {
            'package_name': package_name,
            'customer_name': customer_name,
            'status': status,
            'start_month': start_month,
            'end_month': end_month,
            'min_quantity': min_quantity,
            'max_quantity': max_quantity
        }

        # 处理指定ID列表
        if contract_ids:
            params['contract_ids'] = [id.strip() for id in contract_ids.split(',') if id.strip()]

        # 根据格式类型调用不同的导出方法
        if format_type.lower() == 'excel':
            excel_data = await export_contracts_excel(params, current_user)

            filename = f"零售合同数据_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

            return StreamingResponse(
                io.BytesIO(excel_data.getvalue()),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        else:
            raise HTTPException(status_code=400, detail="不支持的导出格式")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败：{str(e)}")
```


## 六、前端实现

### 6.1 导出组件设计

```typescript
interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  currentFilters: any; // 当前页面的筛选条件
}

const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose, currentFilters }) => {
  const [exportParams, setExportParams] = useState({
    package_name: '',
    customer_name: '',
    status: 'all',
    start_month: '',
    end_month: '',
    min_quantity: '',
    max_quantity: ''
  });
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await contractApi.export(exportParams);
      downloadFile(response.data, `零售合同数据_${formatDate(new Date())}.xlsx`);
      onClose();
    } catch (error) {
      console.error('导出失败', error);
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>导出合同数据</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="套餐名称"
            value={exportParams.package_name}
            onChange={(e) => setExportParams({...exportParams, package_name: e.target.value})}
            margin="normal"
            size="small"
          />

          <TextField
            fullWidth
            label="客户名称"
            value={exportParams.customer_name}
            onChange={(e) => setExportParams({...exportParams, customer_name: e.target.value})}
            margin="normal"
            size="small"
          />

          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>合同状态</InputLabel>
            <Select
              value={exportParams.status}
              label="合同状态"
              onChange={(e) => setExportParams({...exportParams, status: e.target.value})}
            >
              <MenuItem value="all">全部状态</MenuItem>
              <MenuItem value="pending">待生效</MenuItem>
              <MenuItem value="active">生效</MenuItem>
              <MenuItem value="expired">已过期</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <TextField
              label="开始月份"
              type="month"
              value={exportParams.start_month}
              onChange={(e) => setExportParams({...exportParams, start_month: e.target.value})}
              size="small"
            />
            <TextField
              label="结束月份"
              type="month"
              value={exportParams.end_month}
              onChange={(e) => setExportParams({...exportParams, end_month: e.target.value})}
              size="small"
            />
          </Box>

          </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <LoadingButton
          onClick={handleExport}
          loading={loading}
          variant="contained"
        >
          导出
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};
```

### 6.2 快速导出功能

```typescript
// 主页面工具栏中的快速导出
const QuickExportButtons = () => {
  const handleExportAll = async () => {
    try {
      const response = await contractApi.export({});
      downloadFile(response.data, `零售合同数据_全部_${formatDate(new Date())}.xlsx`);
    } catch (error) {
      console.error('导出失败', error);
    }
  };

  const handleExportCurrent = async () => {
    try {
      // 导出当前筛选条件的数据
      const response = await contractApi.export(currentFilters);
      downloadFile(response.data, `零售合同数据_筛选_${formatDate(new Date())}.xlsx`);
    } catch (error) {
      console.error('导出失败', error);
    }
  };

  const handleExportSelected = async () => {
    if (selectedContracts.length === 0) {
      alert('请先选择要导出的合同');
      return;
    }

    try {
      const contractIds = selectedContracts.map(contract => contract.id);
      const response = await contractApi.export({ contract_ids: contractIds.join(',') });
      downloadFile(response.data, `零售合同数据_选中_${formatDate(new Date())}.xlsx`);
    } catch (error) {
      console.error('导出失败', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={handleExportAll}
      >
        导出全部
      </Button>
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={handleExportCurrent}
      >
        导出筛选结果
      </Button>
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={handleExportSelected}
        disabled={selectedContracts.length === 0}
      >
        导出选中项
      </Button>
    </Box>
  );
};
```

### 6.3 文件下载工具函数

```typescript
const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const formatDate = (date: Date) => {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
};
```

## 七、性能优化

### 7.1 大数据量处理

**分页查询优化**：
```python
def export_large_dataset(params, batch_size=1000):
    """大数据量分批导出"""
    query = build_export_query(params)

    # 获取总数
    total_count = DATABASE.retail_contracts.count_documents(query)

    if total_count <= batch_size:
        # 小数据量直接处理
        return export_contracts_batch(query, 0, total_count)
    else:
        # 大数据量分批处理
        all_data = []
        for skip in range(0, total_count, batch_size):
            batch_data = export_contracts_batch(query, skip, batch_size)
            all_data.extend(batch_data)
        return all_data

def export_contracts_batch(query, skip, limit):
    """分批查询和处理"""
    contracts = list(DATABASE.retail_contracts.find(query).skip(skip).limit(limit))

    processed_data = []
    for contract in contracts:
        status = calculate_contract_status(
            contract.get('purchase_start_month'),
            contract.get('purchase_end_month')
        )
        formatted_contract = format_contract_for_export(contract, status)
        processed_data.append(formatted_contract)

    return processed_data
```

### 7.2 内存优化

**流式写入**：
```python
def generate_large_excel_file(data_iter):
    """流式生成大Excel文件"""
    import tempfile
    import os

    # 创建临时文件
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')

    try:
        with pd.ExcelWriter(temp_file.name, engine='openpyxl') as writer:
            # 创建工作表
            workbook = writer.book
            worksheet = workbook.create_sheet('合同数据')

            # 写入标题行
            headers = ['合同编号', '合同名称', '套餐名称', ...]
            for col, header in enumerate(headers, 1):
                worksheet.cell(row=1, column=col, value=header)

            # 流式写入数据
            for row_num, contract_data in enumerate(data_iter, 2):
                for col, value in enumerate(contract_data.values(), 1):
                    worksheet.cell(row=row_num, column=col, value=value)

            # 应用格式
            _format_excel_worksheet(worksheet, None, {})

        # 读取文件内容
        with open(temp_file.name, 'rb') as f:
            file_content = f.read()

        return io.BytesIO(file_content)

    finally:
        # 清理临时文件
        if os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
```

## 八、测试方案

### 8.1 功能测试用例

| 用例编号 | 测试场景 | 输入数据 | 预期结果 |
|---------|---------|---------|---------|
| EXP-001 | 全量导出 | 无筛选条件 | 导出所有合同数据 |
| EXP-002 | 按套餐筛选 | 套餐名称包含"商业" | 导出商业套餐相关合同 |
| EXP-003 | 按状态筛选 | 状态为"生效" | 导出生效状态的合同 |
| EXP-004 | 时间范围筛选 | 2024-01至2024-12 | 导出2024年合同 |
| EXP-005 | 组合筛选 | 套餐+状态+时间 | 导出符合所有条件的合同 |
| EXP-006 | 空结果导出 | 不存在的套餐名称 | 导出空Excel（带列名） |
| EXP-007 | 大数据量导出 | 1000+条记录 | 正常导出，性能可接受 |

### 8.2 性能测试

```python
# 性能测试脚本
async def test_export_performance():
    """测试导出性能"""
    import time

    test_cases = [
        {'count': 100, 'expected_time': 2},
        {'count': 1000, 'expected_time': 5},
        {'count': 5000, 'expected_time': 15},
        {'count': 10000, 'expected_time': 30}
    ]

    for case in test_cases:
        # 创建测试数据
        create_test_data(case['count'])

        # 测试导出
        start_time = time.time()
        result = await export_contracts({}, get_test_user())
        end_time = time.time()

        actual_time = end_time - start_time
        assert actual_time <= case['expected_time'], f"导出{case['count']}条数据耗时{actual_time:.2f}秒，超过预期{case['expected_time']}秒"

        print(f"✓ 导出{case['count']}条数据，耗时{actual_time:.2f}秒")
```

## 九、总结

本Excel导出功能设计提供了完整的数据导出解决方案，具有以下特点：

1. **功能完整**：支持多种筛选条件和导出方式
2. **格式规范**：Excel文件格式美观，包含样式和格式化
3. **性能优化**：支持大数据量的高效导出
4. **用户友好**：提供清晰的导出界面和操作反馈
5. **扩展性强**：易于扩展新的导出格式和字段

该设计方案为零售合同管理模块提供了强大的数据导出能力，满足用户的数据分析和报表需求。