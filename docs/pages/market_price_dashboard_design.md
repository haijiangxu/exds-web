# 市场价格总览 (Market Dashboard) - UI 设计方案

**遵循规范**: 本设计严格遵循《前端页面设计规范》(`docs/前端页面设计规范.md`)，特别是其中定义的“仪表板式布局”模式。

---

## 1. 页面布局与结构

本页面作为“市场价格分析”模块的第一个子 Tab 页，采用“仪表板式布局”，自上而下依次为：

1.  **全局筛选器 (Global Filters)**
2.  **核心指标区 (KPIs)**
3.  **核心图表区 (Core Charts)**
4.  **时段财务速览 (Period Financial Summary)**

**根组件结构**：

```tsx
// MarketDashboard.tsx
import { Box, Grid, Paper, Typography, ... } from '@mui/material';

const MarketDashboard = () => {
    return (
        <Box>
            {/* 1. 全局筛选器 */}
            <GlobalFilters />

            {/* 2. 核心指标区 */}
            <KpiSection />

            {/* 3. 核心图表区 */}
            <ChartsSection />

            {/* 4. 时段财务速览 */}
            <SummaryTableSection />
        </Box>
    );
};
```

---

## 2. 组件详细设计

### 2.1 全局筛选器 (Global Filters)

**功能**: 提供页面级的数据筛选能力。

**布局**: 使用 `Box` 容器，采用 `flex` 布局，使其内容水平排列并靠右对齐。

**组件**:
- **日期选择器**:
    - **组件**: Material-UI X `DatePicker`。
    - **默认值**: 昨日。
- **快捷切换按钮**:
    - **组件**: `ButtonGroup` 包裹两个 `Button`。
    - **标签**: "前一天"、"后一天"。
    - **样式**: `variant="outlined"`。

**参考代码**:
```tsx
<Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
    <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker label="选择日期" />
    </LocalizationProvider>
    <ButtonGroup variant="outlined" sx={{ ml: 2 }}>
        <Button>前一天</Button>
        <Button>后一天</Button>
    </ButtonGroup>
</Box>
```

### 2.2 核心指标区 (KPIs)

**功能**: 以“大数字”卡片形式展示核心财务与风险指标。

**布局**:
- 使用 `Grid container`，`spacing={3}`。
- 分为两个子区域：核心财务指标 (A) 和核心风险指标 (B)。

**组件 (单个 KPI 卡片)**:
- **容器**: `<Paper sx={{ p: 2, height: '100%' }} elevation={2}>`，遵循规范中的仪表板卡片样式。
- **内容**:
    - **指标名称**: `<Typography variant="body2" color="text.secondary">`，如 "现货加权均价 (VWAP_RT)"。
    - **指标数值**: `<Typography variant="h4" sx={{ fontWeight: 'bold' }}>`，如 "450.23"。
    - **单位/副标题**: `<Typography variant="caption" color="text.secondary">`，如 "元/MWh" 或 "发生于 14:15"。

**响应式设计**:
- **大屏 (lg)**: 一行展示所有 9 个指标 (5个财务+4个风险)。
- **中屏 (md)**: 一行展示 4-5 个。
- **移动端 (xs)**: 一行展示 2 个，垂直堆叠。

**A. 核心财务指标 (5个)**
- `Grid size={{ xs: 6, md: 4, lg: 2.4 }}`

**B. 核心风险指标 (4个)**
- `Grid size={{ xs: 6, md: 3, lg: 3 }}`

**参考代码 (单个卡片)**:
```tsx
<Grid size={{ xs: 6, lg: 2.4 }}>
    <Paper sx={{ p: 2, textAlign: 'center' }} elevation={2}>
        <Typography variant="body2" color="text.secondary" noWrap>
            现货加权均价 (VWAP_RT)
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>
            450.23
        </Typography>
        <Typography variant="caption" color="text.secondary">
            元/MWh
        </Typography>
    </Paper>
</Grid>
```

### 2.3 核心图表区 (Core Charts)

**功能**: 可视化价格与负荷曲线。

**布局**:
- 使用 `Grid container`，`spacing={3}`。
- 包含两个图表，桌面端并排显示，移动端垂直堆叠。

**组件 (单个图表)**:
- **容器**: `<Paper sx={{ p: 2, mt: 3, height: 400 }}>`，遵循规范中的图表容器样式。
- **标题**: `<Typography variant="h6" gutterBottom>`。
- **图表库**: `Recharts`。
- **强制功能**:
    - **横屏全屏**: 必须集成 `useChartFullscreen` Hook。
    - **曲线选择**: 必须集成 `useSelectableSeries` Hook，允许用户点击图例切换 `Price_RT` / `Price_DA` 的显隐。
    - **时段背景**: 必须集成 `useTouPeriodBackground` Hook，在图表背景渲染尖峰平谷时段颜色。

**C. 核心价格曲线**
- **Grid size**: `size={{ xs: 12, lg: 6 }}`
- **图表类型**: `LineChart`
- **曲线**:
    - `Price_RT`: 实线 (Solid)
    - `Price_DA`: 虚线 (Dashed)

**D. 核心负荷曲线**
- **Grid size**: `size={{ xs: 12, lg: 6 }}`
- **图表类型**: `LineChart`
- **曲线**:
    - `Total_Volume_RT`: 实线 (Solid)
    - `Total_Volume_DA`: 虚线 (Dashed)

**参考代码 (单个图表容器)**:
```tsx
<Grid size={{ xs: 12, lg: 6 }}>
    <Paper sx={{ p: 2, height: 400, position: 'relative' }}>
        <Typography variant="h6" gutterBottom>核心价格曲线</Typography>
        {/* FullscreenEnterButton, FullscreenExitButton... */}
        <ResponsiveContainer width="100%" height="90%">
            {/* Recharts LineChart... */}
        </ResponsiveContainer>
    </Paper>
</Grid>
```

### 2.4 时段财务速览 (Period Financial Summary)

**功能**: 以表格形式展示各时段的核心财务数据。

**布局**:
- 放置在图表区下方。

**组件**:
- **容器**: `<Paper sx={{ p: 2, mt: 3 }}>`，遵循规范中的表格容器样式。
- **标题**: `<Typography variant="h6" gutterBottom>`，标题为 "时段财务速览"。
- **表格**:
    - **组件**: `TableContainer`, `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`。
    - **响应式**: 在移动端，`TableContainer` 会自然产生水平滚动条。
- **列定义**: `时段` | `时段加权均价 (DA)` | `时段加权均价 (RT)` | `时段加权价差` | `时段平均电量 (RT)` | `时段新能源占比 (RT)`
- **行定义**: 尖、峰、平、谷。

**参考代码**:
```tsx
<Paper sx={{ p: 2, mt: 3 }}>
    <Typography variant="h6" gutterBottom>时段财务速览</Typography>
    <TableContainer>
        <Table stickyHeader size="small">
            <TableHead>
                <TableRow>
                    {/* TableCell headers */}
                </TableRow>
            </TableHead>
            <TableBody>
                {/* TableRow for each period */}
            </TableBody>
        </Table>
    </TableContainer>
</Paper>
```

---

## 3. 总结与检查清单

- [x] **布局**: 采用“仪表板式布局”。
- [x] **容器**: 页面根容器为 `<Box>`，卡片和图表/表格使用 `<Paper>`。
- [x] **组件**: 使用了 `Grid`, `Paper`, `Typography`, `Button`, `DatePicker`, `Table` 等标准 MUI 组件。
- [x] **样式**: `Paper` 的 `elevation` 遵循规范（卡片为2，其他为默认）。
- [x] **Grid v7 语法**: 所有 `Grid` 组件使用 `size` 属性。
- [x] **响应式**: 为 `Grid` 和图表定义了不同断点的布局。
- [x] **强制 Hooks**: 明确要求图表集成 `useChartFullscreen`, `useSelectableSeries`, `useTouPeriodBackground`。
