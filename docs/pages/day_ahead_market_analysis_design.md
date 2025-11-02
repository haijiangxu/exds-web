### “日前市场分析” (Day-Ahead Market Analysis) 子页面设计细节

此页面旨在深度分析“市场计划”，揭示市场对未来一日的共同预期。我们将创建一个名为 `DayAheadAnalysisTab.tsx` 的新组件，它将包含三个核心图表，并遵循项目现有的开发规范。

#### 1. 组件命名与定位

-   **新组件文件名**: `frontend/src/components/DayAheadAnalysisTab.tsx`
-   **集成位置**: 将作为第二个标签页被添加至 `frontend/src/pages/MarketPriceAnalysisPage.tsx` 中。

#### 2. 数据接口 (API) 设计

-   **后端 Endpoint**: 新增 `GET /api/v1/day_ahead_analysis`
-   **请求参数**: `date` (格式: `YYYY-MM-DD`)
-   **后端逻辑**:
    1.  接收日期字符串 `date_str`。
    2.  查询 `day_ahead_spot_price` 集合，匹配 `date_str` 字段。
    3.  按 `datetime` 字段升序排序，返回该日期的全部96个数据点。
    4.  为简化前端处理，将数据库字段直接映射到返回的JSON中。`avg_clearing_price` 作为价格，`total_clearing_power` 作为总负荷，各类电源出力字段也一并返回。
-   **返回数据结构 (JSON)**:
    ```json
    [
      {
        "time_str": "00:15",
        "datetime": "...",
        "avg_clearing_price": 150.50,
        "total_clearing_power": 8500.0,
        "thermal_clearing_power": 5000.0,
        "hydro_clearing_power": 1000.0,
        "wind_clearing_power": 1500.0,
        "solar_clearing_power": 0.0,
        "pumped_storage_clearing_power": 500.0,
        "battery_storage_clearing_power": 500.0
      },
      ... 95 more points
    ]
    ```
    *注：储能(`storage`)在设计文档中是一个总称，对应数据库中的 `pumped_storage` 和 `battery_storage`，前端需要将这两者相加得到总的储能出力。*

#### 3. 前端组件设计

##### a. 全局筛选器

-   **组件**: 复用 `PriceCurveComparisonTab.tsx` 中的 `DatePicker` 和 `IconButton` (左右箭头)。
-   **功能**: 提供日期选择和前后一天快速切换功能，每次日期变化时，重新调用 `fetchData` 函数。

##### b. 卡片一：日前价格与负荷 (DA Price & Volume)

-   **图表类型**: `recharts` 的 `ComposedChart`，双Y轴折线图。
-   **X轴**: `time_str`，代表96个时间点。
-   **Y1轴 (左侧)**: 价格 (元/MWh)。对应数据字段 `avg_clearing_price`。
-   **Y2轴 (右侧)**: 电量 (MWh)。对应数据字段 `total_clearing_power`。
-   **数据系列**:
    -   一条 `<Line>` 用于展示 `avg_clearing_price`。
    -   另一条 `<Line>` (或 `<Area>`) 用于展示 `total_clearing_power`。
-   **背景**: **必须**使用 `useTouPeriodBackground` Hook，根据分时电价时段渲染图表背景色，提供价格高低的时间背景。
-   **交互**:
    -   **必须**使用 `useChartFullscreen` Hook 实现图表的全屏查看功能。
    -   使用 `<Tooltip>` 展示鼠标悬停点位的详细数据。

##### c. 卡片二：日前供给堆栈 (DA Supply Stack)

-   **图表类型**: `recharts` 的 `ComposedChart`，堆叠面积图 (`Stacked Area Chart`)。
-   **X轴**: `time_str`，代表96个时间点。
-   **Y轴**: 电量 (MWh)。
-   **数据系列**:
    -   使用多个 `<Area>` 组件，并为它们设置相同的 `stackId`。
    -   每个 `<Area>` 对应一个电源类型：
        -   `thermal_clearing_power` (火电)
        -   `hydro_clearing_power` (水电)
        -   `wind_clearing_power` (风电)
        -   `solar_clearing_power` (光伏)
        -   `storage_clearing_power` (储能 = `pumped_storage` + `battery_storage`)
-   **交互**:
    -   **必须**使用 `useChartFullscreen` Hook。
    -   使用 `<Tooltip>` 和 `<Legend>` 方便用户理解各色块代表的电源。

##### d. 卡片三：日前供给曲线 (DA Supply Curve)

-   **图表类型**: `recharts` 的 `ScatterChart` (散点图)。
-   **X轴**: 电量 (MWh)。数据源为 `total_clearing_power`。
-   **Y轴**: 价格 (元/MWh)。数据源为 `avg_clearing_price`。
-   **数据系列**: 一个 `<Scatter>` 组件，将96个数据点绘制在图上，形成供给曲线的形状。
-   **交互**:
    -   **必须**使用 `useChartFullscreen` Hook。
    -   `<Tooltip>` 显示每个点的具体价格和电量值。
