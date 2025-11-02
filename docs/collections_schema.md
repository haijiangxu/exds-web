# 数据集结构文档

本文档描述了 MongoDB `exds` 数据库中，由RPA管道处理和存储的关键数据集的结构、字段名称及其中文解释。

## 1. 现货价格数据集

这两个数据集拥有完全相同的结构，用于存储现货市场的价格和电量信息。

-   `real_time_spot_price` (实时现货价格)
-   `day_ahead_spot_price` (日前现货价格)

### 1.1. 结构与字段解释

| 字段名称 (Field Name)               | 数据类型 (Data Type) | 中文解释                                                     |
| ----------------------------------- | -------------------- | ------------------------------------------------------------ |
| `_id`                               | ObjectId             | MongoDB 自动生成的唯一文档ID。                               |
| `datetime`                          | ISODate              | 标准的UTC时间戳。此时间戳用于排序、计算和时间窗口划分。对于业务日 `D` 的 `24:00` 时刻，此字段值为 `D+1` 日的 `00:00:00`。 |
| `date_str`                          | String               | 业务日期字符串，格式为 `YYYY-MM-DD`。用于按业务日进行数据检索。对于 `第二天 00:00` 的聚合数据，此字段值仍为“第一天”的日期。 |
| `time_str`                          | String               | 业务时刻字符串，格式为 `HH:MM`。用于按业务时刻进行数据检索。对于 `第二天 00:00` 的聚合数据，此字段值为 `24:00`。 |
| `total_clearing_power`              | Double               | **出清总电量** (单位: MWh)，最多保留4位小数。                 |
| `thermal_clearing_power`            | Double               | **火电出清电量** (单位: MWh)，最多保留4位小数。               |
| `hydro_clearing_power`              | Double               | **水电出清电量** (单位: MWh)，最多保留4位小数。               |
| `wind_clearing_power`               | Double               | **风电出清电量** (单位: MWh)，最多保留4位小数。               |
| `solar_clearing_power`              | Double               | **光伏出清电量** (单位: MWh)，最多保留4位小数。               |
| `pumped_storage_clearing_power`     | Double               | **抽蓄出清电量** (单位: MWh)，最多保留4位小数。               |
| `battery_storage_clearing_power`    | Double               | **储能出清电量** (单位: MWh)，最多保留4位小数。               |
| `avg_clearing_price`                | Double               | **出清均价** (单位: 元/MWh)，最多保留2位小数。                |

### 1.2. 索引 (Indexes)

1.  **唯一索引**: `{ "datetime": 1 }`, `{ "unique": true }`
2.  **复合索引**: `{ "date_str": 1, "time_str": 1 }`

---

## 2. 中长期合同数据集

### 2.1. `contracts_detailed_daily` (每日合同分解明细)

| 字段名称 (Field Name)      | 数据类型 (Data Type) | 中文解释                                                     |
| -------------------------- | -------------------- | ------------------------------------------------------------ |
| `_id`                      | ObjectId             | MongoDB 自动生成的唯一文档ID。                               |
| `date`                     | String               | 业务日期字符串，格式为 `YYYY-MM-DD`。                        |
| `contract_name`            | String               | 合同名称。                                                   |
| `contract_type`            | String               | 合同类型（例如：市场化, 绿电）。由下载时的上下文决定。     |
| `contract_period`          | String               | 合同周期（例如：年度, 月度, 月内）。由下载时的上下文决定。 |
| `trade_sequence_name`      | String               | 交易序列名称。                                               |
| `seller_name`              | String               | 售方名称。                                                   |
| `buyer_name`               | String               | 购方名称。                                                   |
| `purchase_type`            | String               | 购电类型。                                                   |
| `daily_total_quantity`     | Double               | 日合计电量 (MWh)。                                           |
| `daily_avg_price`          | Double               | 日合计均价 (元/MWh)。                                        |
| `entity`                   | String               | 实体（例如：全市场, 售电公司）。                             |
| `periods`                  | Array of Objects     | 分时段数据数组，每个对象包含一个时段的电量和电价。       |
| `periods.period`           | Integer              | 时段序号（例如：1, 2, ..., 48）。                            |
| `periods.quantity_mwh`     | Double               | 该时段的电量 (MWh)。                                         |
| `periods.price_yuan_per_mwh` | Double               | 该时段的电价 (元/MWh)。                                      |

#### 索引 (Indexes)

1.  **唯一索引**: `{ "合同名称": 1, "date": 1 }`, `{ "unique": true }`
2.  **复合查询索引**: `{ "contract_type": 1, "contract_period": 1, "date": -1 }`

### 2.2. `contracts_aggregated_daily` (每日合同聚合统计)

| 字段名称 (Field Name)      | 数据类型 (Data Type) | 中文解释                                                     |
| -------------------------- | -------------------- | ------------------------------------------------------------ |
| `_id`                      | ObjectId             | MongoDB 自动生成的唯一文档ID。                               |
| `date`                     | String               | 业务日期字符串，格式为 `YYYY-MM-DD`。                        |
| `contract_type`            | String               | 合同类型（例如：整体, 市场化, 绿电）。                     |
| `contract_period`          | String               | 合同周期（例如：整体, 年度, 月度）。                        |
| `daily_total_quantity`     | Double               | 日合计电量 (MWh)。                                           |
| `daily_avg_price`          | Double               | 日合计均价 (元/MWh)。                                        |
| `entity`                   | String               | 实体（例如：全市场, 售电公司）。                             |
| `periods`                  | Array of Objects     | 分时段数据数组，每个对象包含一个时段的电量和电价。       |
| `periods.period`           | Integer              | 时段序号（例如：1, 2, ..., 48）。                            |
| `periods.quantity_mwh`     | Double               | 该时段的电量 (MWh)。                                         |
| `periods.price_yuan_per_mwh` | Double               | 该时段的电价 (元/MWh)。                                      |

#### 索引 (Indexes)

1.  **唯一索引**: `{ "entity": 1, "date": 1, "contract_type": 1, "contract_period": 1 }`, `{ "unique": true }`

---

## 3. 每日信息发布数据集

### 3.1. `daily_release` (日前预测摘要)

| 字段名称 (Field Name)         | 数据类型 (Data Type) | 中文解释                     |
| ----------------------------- | -------------------- | ---------------------------- |
| `_id`                         | ObjectId             | MongoDB 自动生成的唯一文档ID。 |
| `datetime`                    | ISODate              | 标准的UTC时间戳。            |
| `system_load_forecast`        | Double               | 短期系统负荷预测。           |
| `pv_forecast`                 | Double               | 短期新能源负荷预测:光伏总加。 |
| `wind_forecast`               | Double               | 短期新能源负荷预测:风电总加。 |
| `tieline_plan`                | Double               | 联络线总计划。               |
| `nonmarket_unit_forecast`     | Double               | 非市场化机组出力预测。       |

#### 索引 (Indexes)

1.  **唯一索引**: `{ "datetime": 1 }`, `{ "unique": true }`

### 3.2. `maintenance_plans` (检修计划)

| 字段名称 (Field Name) | 数据类型 (Data Type) | 中文解释         |
| --------------------- | -------------------- | ---------------- |
| `_id`                 | ObjectId             | MongoDB 自动生成的唯一文档ID。 |
| `equipment_name`      | String               | 设备名称。       |
| `equipment_type`      | String               | 设备类型。       |
| `start_time`          | ISODate              | 开始时间。       |
| `end_time`            | ISODate              | 结束时间。       |
| `major_category`      | String               | 专业分类。       |
| `minor_category`      | String               | 分类。           |
| `content`             | String               | 工作内容。       |

#### 索引 (Indexes)

1.  **唯一索引**: `{ "equipment_name": 1, "start_time": 1, "end_time": 1 }`, `{ "unique": true }`

---

## 4. 计量点负荷曲线数据集

### 4.1. `mp_load_curve`

| 字段名称 (Field Name) | 数据类型 (Data Type) | 中文解释                               |
| --------------------- | -------------------- | -------------------------------------- |
| `_id`                 | ObjectId             | MongoDB 自动生成的唯一文档ID。         |
| `mp_id`               | String               | 计量点ID。                             |
| `datetime`            | ISODate              | 标准的UTC时间戳。                      |
| `load_mwh`            | Double               | 负荷 (MWh)。                           |

#### 索引 (Indexes)

1.  **唯一索引**: `{ "mp_id": 1, "datetime": 1 }`, `{ "unique": true }`

---

## 5. 国网代理购电价格数据集

### 5.1. `price_sgcc`

| 字段名称 (Field Name) | 数据类型 (Data Type) | 中文解释                               |
| --------------------- | -------------------- | -------------------------------------- |
| `_id`                 | String               | 文档ID，格式为 `YYYY-MM`。             |
| `source_file`         | String               | 原始文件名。                           |
| `effective_date`      | String               | 生效日期。                             |
| `purchase_scale_kwh`  | Double               | 代理工商业购电电量规模 (kWh)。         |
| `purchase_price`      | Double               | 代理工商业购电价格。                   |
| `avg_on_grid_price`   | Double               | 当月平均上网电价。                     |
| `historical_deviation_discount` | Double | 历史偏差电费折价。 |
| `system_op_cost_discount` | Double | 系统运行费用折价。 |
| `network_loss_price` | Double | 上网环节线损电价。 |
| `full_data`           | Object               | 包含解析出的完整PDF内容的JSON对象。    |

---

## 6. 现货结算数据集

### 6.1. `spot_settlement_daily` (每日结算汇总)

| 字段名称 (Field Name) | 数据类型 (Data Type) | 中文解释                 |
| --------------------- | -------------------- | ------------------------ |
| `_id` | ObjectId | MongoDB 自动生成的唯一文档ID。 |
| `operating_date`      | String               | 业务日期，格式 `YYYY-MM-DD`。 |
| `contract_volume`     | Double               | 合同电量。               |
| `contract_avg_price` | Double | 合同平均价。 |
| `contract_fee` | Double | 合同费用。 |
| `day_ahead_demand_volume` | Double | 日前需求电量。 |
| `day_ahead_deviation_fee` | Double | 日前偏差费用。 |
| `actual_consumption_volume` | Double | 实际用电量。 |
| `real_time_deviation_fee` | Double | 实时偏差费用。 |
| `deviation_recovery_fee` | Double | 偏差回收费用。 |
| `excess_recovery_fee` | Double | 超额回收费用。 |
| `total_fee`           | Double               | 总费用。                 |
| `settlement_avg_price`| Double               | 结算平均价。             |

#### 索引 (Indexes)

1.  **唯一索引**: `{ "operating_date": 1 }`, `{ "unique": true }`

### 6.2. `spot_settlement_period` (分时结算明细)

| 字段名称 (Field Name) | 数据类型 (Data Type) | 中文解释                 |
| --------------------- | -------------------- | ------------------------ |
| `_id` | ObjectId | MongoDB 自动生成的唯一文档ID。 |
| `operating_date`      | String               | 业务日期，格式 `YYYY-MM-DD`。 |
| `period`              | Integer              | 时段 (1-96)。            |
| `datetime`            | ISODate              | 标准的UTC时间戳。        |
| `contract_volume` | Double | 合同电量。 |
| `contract_avg_price` | Double | 合同平均价。 |
| `contract_fee` | Double | 合同费用。 |
| `day_ahead_demand_volume` | Double | 日前需求电量。 |
| `day_ahead_market_avg_price` | Double | 日前市场均价。 |
| `day_ahead_deviation_fee` | Double | 日前偏差费用。 |
| `actual_consumption_volume` | Double | 实际用电量。 |
| `real_time_market_avg_price` | Double | 实时市场均价。 |
| `real_time_deviation_fee` | Double | 实时偏差费用。 |
| `deviation_volume` | Double | 偏差电量。 |
| `deviation_rate` | Double | 偏差率。 |
| `deviation_recovery_volume` | Double | 偏差回收电量。 |
| `deviation_assessment_price` | Double | 偏差考核价。 |
| `deviation_recovery_fee` | Double | 偏差回收费用。 |
| `total_energy_fee`    | Double               | 总电能费用。             |
| `energy_settlement_avg_price` | Double | 电能结算均价。 |

#### 索引 (Indexes)

1.  **唯一索引**: `{ "operating_date": 1, "period": 1 }`, `{ "unique": true }`
2.  **查询索引**: `{ "datetime": -1 }`

---

## 7. 用户与计量体系数据集

这一组数据集共同构成了用户、电表、计量点的关系和原始数据。

### 7.1. `user_profiles` (用户档案)

此数据集存储了电力用户的基本档案信息。

| 字段名称 (Field Name) | 数据类型 (Data Type) | 中文解释 |
| :--- | :--- | :--- |
| `_id` | ObjectId | MongoDB 自动生成的唯一文档ID。 |
| `user_name` | String | **用户全称**。 |
| `short_name` | String | **用户简称**。 |
| `industry` | String | 所属**行业**。 |
| `voltage` | String | **电压等级**。 |
| `region` | String | 所在**地区/市**。 |
| `district` | String | 所在**区/县**。 |
| `address` | String | 详细**地址**。 |
| `location` | Object | **地理坐标**，采用 GeoJSON Point 格式。 |
| `location.type` | String | 坐标类型，固定为 "Point"。 |
| `location.coordinates` | Array | 坐标数组 `[经度, 纬度]`。 |

#### 索引 (Indexes)

1.  **默认唯一索引**: `{ "_id": 1 }`
2.  **单字段索引**: `{ "user_name": 1 }` (用于快速按用户全称查询)

### 7.2. `meters` (电表)

此数据集存储了物理电表的基本信息。

| 字段名称 (Field Name) | 数据类型 (Data Type) | 中文解释 |
| :--- | :--- | :--- |
| `_id` | String | **电表资产号**，作为此文档的唯一标识符。 |
| `user_name` | String | 此电表所属的**用户全称**。 |
| `account_id` | String | **户号**，电力公司分配给用户的唯一编号。 |
| `multiplier` | Number | **倍率**，用于将电表读数转换为实际用电量的乘数。 |

#### 索引 (Indexes)

1.  **默认唯一索引**: `{ "_id": 1 }`

### 7.3. `measure_point` (计量点)

此数据集定义了物理的或逻辑的电能计量点，并将其与用户关联。

| 字段名称 (Field Name) | 数据类型 (Data Type) | 中文解释 |
| :--- | :--- | :--- |
| `_id` | String | **计量点ID**，作为此文档的唯一标识符。 |
| `user_name` | String | 此计量点所属的**用户全称**。 |
| `account_id` | String | **户号**。 |
| `meter_id` | String | **电表资产号**，关联到 `meters` 集合。 |
| `allocation_percentage` | Number | **分摊比例 (%)**。表示此计量点的读数在多大程度上归属于该用户。 |

#### 索引 (Indexes)

1.  **默认唯一索引**: `{ "_id": 1 }`
2.  **单字段索引**: `{ "user_name": 1 }` (用于快速查找特定用户下的所有计量点)

### 7.4. `meter_data` (电表数据)

此数据集存储了来自物理电表的原始时间序列读数。

| 字段名称 (Field Name) | 数据类型 (Data Type) | 中文解释 |
| :--- | :--- | :--- |
| `_id` | ObjectId | MongoDB 自动生成的唯一文档ID。 |
| `日期时间` | ISODate | **数据时间戳**，表示该条读数记录的时间点。 |
| `表号` | String | **电表资产号**，与 `meters` 集合的 `_id` 对应。 |
| `示数` | Number | 电表在该时间点的**累计读数**。 |
| `用电量` | Number | **该时段的用电量**，通常是当前示数与上一个时间点示数的差值。 |

#### 索引 (Indexes)

1.  **默认唯一索引**: `{ "_id": 1 }`
2.  **复合索引**: `{ "表号": 1, "日期时间": 1 }` (核心索引，用于快速查询特定电表的时间序列数据)