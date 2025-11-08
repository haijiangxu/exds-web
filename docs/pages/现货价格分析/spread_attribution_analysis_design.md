### “价差归因分析” (Spread Attribution) 子页面设计细节

此页面旨在深入分析现货价格与日前价格产生偏差的原因，是整个市场价格分析模块的核心。我们将创建一个名为 `SpreadAnalysisTab.tsx` 的新组件。

#### 1. 组件命名与定位

-   **新组件文件名**: `frontend/src/components/SpreadAnalysisTab.tsx`
-   **集成位置**: 将作为新的标签页被添加至 `frontend/src/pages/MarketPriceAnalysisPage.tsx` 中。

#### 2. 数据接口 (API) 设计

-   **后端 Endpoint**: 新增 `GET /api/v1/market-analysis/spread-attribution`
-   **请求参数**: `date` (格式: `YYYY-MM-DD`)
-   **后端逻辑**:
    1.  接收日期字符串 `date_str`。
    2.  **并行查询**: 同时查询 `day_ahead_spot_price` 和 `real_time_spot_price` 集合以获取指定日期的96点数据。
    3.  **数据对齐与计算**: 以96个时间点为基准，合并两个数据源。对于每个时间点 `i`，计算以下偏差值：
        -   `price_spread = price_rt[i] - price_da[i]`
        -   `total_volume_deviation = total_volume_rt[i] - total_volume_da[i]`
        -   `wind_deviation = wind_power_rt[i] - wind_power_da[i]`
        -   `solar_deviation = solar_power_rt[i] - solar_power_da[i]`
        -   `thermal_deviation = thermal_power_rt[i] - thermal_power_da[i]`
        -   `hydro_deviation = hydro_power_rt[i] - hydro_power_da[i]`
        -   `storage_deviation = storage_power_rt[i] - storage_power_da[i]`
    4.  **时段聚合分析**:
        -   获取当天的分时电价规则 (`tou_rules`)。
        -   按“尖峰平谷”时段对96个点的偏差数据进行分组。
        -   为每个时段，计算所有偏差字段的**算术平均值**。
    5.  **构建响应**: 返回一个包含两部分的JSON对象：
        -   `time_series`: 包含96个点的、合并计算后的详细偏差数据。
        -   `systematic_bias`: 按时段聚合后的系统性偏差统计表格数据。

-   **返回数据结构 (JSON)**:
    ```json
    {
      "time_series": [
        {
          "time_str": "00:15",
          "price_spread": -5.30,
          "total_volume_deviation": 150.0,
          "wind_deviation": 80.0,
          "solar_deviation": 0.0,
          "thermal_deviation": 50.0,
          "hydro_deviation": 20.0,
          "storage_deviation": 0.0
        },
        ...
      ],
      "systematic_bias": [
        {
          "period_name": "尖峰",
          "avg_price_spread": 105.2,
          "avg_total_volume_deviation": -500.1,
          "avg_wind_deviation": -150.0,
          "avg_solar_deviation": -400.0,
          "avg_thermal_deviation": 50.0
        },
        ...
      ]
    }
    ```

#### 3. 前端组件设计

##### a. 卡片一：价格偏差主图 (Price Spread Chart)

-   **图表类型**: 柱状图 (`BarChart`)。
-   **数据**: `time_series` 数组中的 `price_spread` 字段。
-   **实现**: 复用“现货价格波动”图表的 `<Cell>` 方案，`price_spread > 0` 为红色，否则为绿色。

##### b. 卡片二：核心偏差归因 (Deviation Drivers)

-   **图表类型**: 多Y轴的复合图 (`ComposedChart`)。
-   **核心交互**: **必须**使用项目内置的 `useSelectableSeries` Hook 来实现数据曲线的动态显示/隐藏。
-   **Y1轴 (价格偏差)**: 使用 `<Bar>` 展示 `price_spread`，作为分析基准。
-   **Y2轴 (电量偏差)**: 使用 `<Line>` 展示可选择的偏差曲线，包括 `total_volume_deviation`, `wind_deviation`, `solar_deviation`, `thermal_deviation` 等。
-   **实现**:
    1.  定义曲线配置，传入 `useSelectableSeries`。
    2.  使用该Hook返回的 `SeriesSelector` 组件（生成一组Checkbox）和渲染用的 `renderSeries` 组件。

##### c. 卡片三：系统性偏差分析 (Systematic Bias)

-   **组件类型**: Material-UI 的 `Table`。
-   **数据**: 直接渲染API返回的 `systematic_bias` 数组。
-   **样式**: 对正负偏差值应用红/绿色以增强可读性。

##### d. 卡片四：偏差相关性 (Deviation Correlation)

-   **图表类型**: 散点图 (`ScatterChart`)。
-   **X轴**: `total_volume_deviation` (总量偏差)。
-   **Y轴**: `price_spread` (价格偏差)。
-   **数据**: `time_series` 数组。此图直观展示负荷预测偏差与价格偏差的线性关系。