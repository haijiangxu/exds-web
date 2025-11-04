# 后端 API 检查指导：Market Dashboard

## API 端点
`GET /api/v1/market-analysis/dashboard`

## 当前实现状态

### ✅ 已正确实现的部分

1. **参数接收**：接收 `date_str` 参数（格式：`YYYY-MM-DD`）
2. **数据查询**：
   - 当前使用 `datetime` 范围查询：`{"datetime": {"$gte": start_date, "$lt": end_date}}`
   - 按 `datetime` 升序排序
3. **数据合并**：使用 `time_str` 作为键进行日前/实时数据合并
4. **返回数据**：包含完整的 `time_series` 数组，每个元素包含必需的字段

### 📊 数据验证结果

运行以下命令测试 API：

```bash
# 测试 API 响应
curl "http://127.0.0.1:8005/api/v1/market-analysis/dashboard?date_str=2024-01-15" | jq
```

**必须验证的数据点**：

1. ✅ `time_series[0].time_str` 应为 `"00:15"`
2. ✅ `time_series[95].time_str` 应为 `"24:00"`
3. ✅ `time_series` 数组长度应为 `96`
4. ✅ 每个元素包含以下字段：
   ```json
   {
     "period": 1,
     "time": "00:15",
     "time_str": "00:15",
     "price_rt": 123.45,
     "price_da": 120.00,
     "volume_rt": 1000.0,
     "volume_da": 950.0,
     "spread": 3.45,
     "period_type": "深谷"
   }
   ```

## 🔧 优化建议（可选）

### 建议 1：使用 date_str 字段进行查询

根据 `docs/collections_schema.md` 的建议，现货价格数据集建立了 `date_str` 字段的索引，使用该字段查询会更高效。

**当前实现**（webapp/api/v1.py 第 517-521 行）：
```python
# 使用 datetime 范围进行查询，以提高稳健性
end_date = start_date + timedelta(days=1)
query = {"datetime": {"$gte": start_date, "$lt": end_date}}
da_docs = list(DA_PRICE_COLLECTION.find(query).sort("datetime", 1))
rt_docs = list(RT_PRICE_COLLECTION.find(query).sort("datetime", 1))
```

**优化后**：
```python
# 使用 date_str 字段查询（利用索引提高效率）
query = {"date_str": date_str}
da_docs = list(DA_PRICE_COLLECTION.find(query).sort("period", 1))
rt_docs = list(RT_PRICE_COLLECTION.find(query).sort("period", 1))
```

**优势**：
- ✅ 利用复合索引 `{"date_str": 1, "time_str": 1}` 提高查询性能
- ✅ 避免日期时间转换，代码更简洁
- ✅ 与数据库设计意图一致

**注意事项**：
- 确保数据集中存在 `period` 字段（时段序号，1-96）
- 如果没有 `period` 字段，继续使用 `datetime` 排序也是可以的

### 建议 2：添加数据完整性检查

在返回数据前，添加服务端验证：

```python
# 在组装 time_series 后，返回前添加
if len(time_series) != 96:
    logger.warning(f"数据不完整：date={date_str}, 数据点数量={len(time_series)}，应为96")

if time_series and time_series[0].get("time_str") != "00:15":
    logger.warning(f"数据起点异常：date={date_str}, 起点={time_series[0].get('time_str')}，应为00:15")
```

## 📝 测试检查清单

使用以下检查清单进行完整测试：

### 1. API 响应结构
- [ ] 返回 JSON 包含 `financial_kpis` 对象
- [ ] 返回 JSON 包含 `risk_kpis` 对象
- [ ] 返回 JSON 包含 `time_series` 数组
- [ ] 返回 JSON 包含 `period_summary` 数组

### 2. time_series 数据验证
- [ ] 数组长度为 96
- [ ] 第一个元素的 `time_str` 为 `"00:15"`
- [ ] 最后一个元素的 `time_str` 为 `"24:00"`
- [ ] 每个元素包含必需字段：`period`, `time_str`, `price_rt`, `price_da`, `volume_rt`, `volume_da`, `spread`, `period_type`
- [ ] `period` 字段从 1 递增到 96
- [ ] `period_type` 字段值为：`"尖峰"`, `"高峰"`, `"平段"`, `"低谷"`, `"深谷"` 之一

### 3. 边界情况测试
- [ ] 测试数据缺失日期（应返回空数组或适当错误）
- [ ] 测试未来日期（应返回空数组或提示）
- [ ] 测试无效日期格式（应返回 422 错误）

### 4. 性能测试
- [ ] 查询响应时间 < 500ms（正常情况）
- [ ] 查询响应时间 < 200ms（优化后，使用 date_str 查询）

## 🎯 前端期望的数据格式

```typescript
interface DashboardData {
    date: string;
    financial_kpis: FinancialKPIs;
    risk_kpis: RiskKPIs;
    time_series: TimeSeriesPoint[];  // 96个元素
    period_summary: PeriodSummary[];
}

interface TimeSeriesPoint {
    period: number;          // 1-96
    time: string;            // "00:15"
    time_str: string;        // "00:15" (前端必需)
    price_rt: number | null;
    price_da: number | null;
    volume_rt: number;
    volume_da: number;
    spread: number | null;
    period_type: string;     // "尖峰" | "高峰" | "平段" | "低谷" | "深谷"
}
```

## 🔍 调试命令

```bash
# 1. 检查数据库中的数据
mongosh exds --eval 'db.day_ahead_spot_price.find({date_str: "2024-01-15"}).count()'
mongosh exds --eval 'db.real_time_spot_price.find({date_str: "2024-01-15"}).count()'

# 2. 查看第一个数据点
mongosh exds --eval 'db.day_ahead_spot_price.find({date_str: "2024-01-15"}).sort({datetime: 1}).limit(1).pretty()'

# 3. 查看最后一个数据点
mongosh exds --eval 'db.day_ahead_spot_price.find({date_str: "2024-01-15"}).sort({datetime: -1}).limit(1).pretty()'

# 4. 测试 API
curl -s "http://127.0.0.1:8005/api/v1/market-analysis/dashboard?date_str=2024-01-15" | jq '.time_series | length'
curl -s "http://127.0.0.1:8005/api/v1/market-analysis/dashboard?date_str=2024-01-15" | jq '.time_series[0]'
curl -s "http://127.0.0.1:8005/api/v1/market-analysis/dashboard?date_str=2024-01-15" | jq '.time_series[-1]'
```

## ✅ 当前状态总结

**后端实现基本正确**，无需立即修改。只需要进行以下验证：

1. 使用上述测试命令验证数据正确性
2. 检查浏览器控制台，查看前端添加的验证警告
3. 如果发现数据异常，再回来查看本文档的优化建议

**前端已完成**：
- ✅ XAxis interval 调整为 11（每3小时显示一个刻度）
- ✅ 添加数据验证逻辑（会在控制台输出警告）
- ✅ 使用 `time_str` 作为横坐标

**下一步**：
1. 启动前端开发服务器，测试页面显示
2. 查看浏览器控制台，检查是否有数据验证警告
3. 如果有警告，使用本文档的调试命令排查问题
