### “现货市场复盘” (The Reality) 子页面设计细节

此页面旨在深度分析“物理现实”，复盘市场实际运行情况，与“日前市场分析”形成直接对比。我们将创建一个名为 `RealTimeAnalysisTab.tsx` 的新组件。

#### 1. 组件命名与定位

-   **新组件文件名**: `frontend/src/components/RealTimeAnalysisTab.tsx`
-   **集成位置**: 将作为新的标签页被添加至 `frontend/src/pages/MarketPriceAnalysisPage.tsx` 中。

#### 2. 数据接口 (API) 设计

-   **后端 Endpoint**: 新增 `GET /api/v1/market-analysis/real-time`
-   **请求参数**: `date` (格式: `YYYY-MM-DD`)
-   **后端逻辑**:
    1.  接收日期字符串 `date_str`。
    2.  查询 `real_time_spot_price` 集合，匹配 `date_str` 字段，并按 `datetime` 升序排序。
    3.  在内存中处理查询结果：遍历96个数据点，为每个点计算**价格爬坡 (`price_ramp`)**，即 `price_ramp = price_rt(i) - price_rt(i-1)`。第一个数据点的 `price_ramp` 为 `null` 或 `0`。
    4.  返回包含这个新增 `price_ramp` 字段的96个数据点列表。
-   **返回数据结构 (JSON)**:
    ```json
    [
      {
        "time_str": "00:15",
        "datetime": "...",
        "avg_clearing_price": 155.20,
        "total_clearing_power": 8600.0,
        "thermal_clearing_power": 5100.0,
        "hydro_clearing_power": 1000.0,
        "wind_clearing_power": 1500.0,
        "solar_clearing_power": 0.0,
        "pumped_storage_clearing_power": 500.0,
        "battery_storage_clearing_power": 500.0,
        "price_ramp": 5.20 // 新增字段
      },
      ... 95 more points
    ]
    ```

#### 3. 前端组件设计

将复用 `DayAheadAnalysisTab.tsx` 的整体结构，包括日期选择器、加载状态、以及 `renderChartContainer` 辅助函数。

##### a. 卡片一：现货价格与负荷 (RT Price & Volume)

-   **图表类型**: `recharts` 的 `ComposedChart`，双Y轴折线图。
-   **数据**: Y1轴使用 `avg_clearing_price`，Y2轴使用 `total_clearing_power`。
-   **备注**: 此图表与“日前”版本结构相同，仅数据源为现货数据。

##### b. 卡片二：现货供给堆栈 (RT Supply Stack)

-   **图表类型**: `recharts` 的 `ComposedChart`，堆叠面积图。
-   **数据**: 使用 `thermal_clearing_power`, `hydro_clearing_power` 等现货电源出力数据。
-   **备注**: 此图表与“日前”版本结构相同，用于和日前供给堆栈进行对比，分析计划与实际的差异。

##### c. 卡片三：现货供给曲线 (RT Supply Curve)

-   **图表类型**: `recharts` 的 `ScatterChart` (散点图)。
-   **数据**: X轴为 `total_clearing_power`，Y轴为 `avg_clearing_price`。
-   **备注**: 此图表与“日前”版本结构相同，用于观察实际的边际成本曲线。

##### d. 卡片四：现货价格波动 (RT Price Volatility)

-   **图表类型**: `recharts` 的 `ComposedChart`，包含一个 `<Bar>` 组件的柱状图。
-   **X轴**: `time_str`，代表96个时间点。
-   **Y轴**: 价格波动 (元/MWh)。
-   **数据系列**:
    -   一个 `<Bar>` 组件，其 `dataKey` 为后端计算好的 `price_ramp` 字段。
    -   使用 `<ReferenceLine y={0} stroke="#000" />` 来明确标识零轴。
    -   为了区分正负波动，可以为 `<Bar>` 组件提供一个自定义的 `shape`，根据值的正负返回不同颜色的矩形。
-   **交互**:
    -   **必须**使用 `useChartFullscreen` Hook。
    -   `<Tooltip>` 显示每个时点的具体波动值。