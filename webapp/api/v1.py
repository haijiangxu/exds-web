import os
import tempfile
import shutil
from fastapi import APIRouter, Query, HTTPException, File, UploadFile, Form, Response, Body
from webapp.tools.mongo import DATABASE
from typing import List, Dict
from datetime import datetime, timedelta
import calendar
import statistics
from bson import json_util
import json

from webapp.api import v1_retail_packages, v1_customers, v1_retail_contracts
from webapp.services.package_service import PackageService
from webapp.services.pricing_engine import PricingEngine
from webapp.services.pricing_model_service import pricing_model_service

# 创建一个API路由器
router = APIRouter(prefix="/api/v1", tags=["v1"])
router.include_router(v1_retail_packages.router)
router.include_router(v1_customers.router)  # 客户管理路由
router.include_router(v1_retail_contracts.router)  # 零售合同管理路由

# --- 集合定义 ---
USER_COLLECTION = DATABASE['user_load_data']
DA_PRICE_COLLECTION = DATABASE['day_ahead_spot_price']
RT_PRICE_COLLECTION = DATABASE['real_time_spot_price']
TOU_RULES_COLLECTION = DATABASE['tou_rules']
PRICE_SGCC_COLLECTION = DATABASE['price_sgcc']


# ##############################################################################
# 现有分析API (Existing Analysis APIs)
# ##############################################################################

@router.get("/users", summary="获取所有唯一的用户列表")
def get_users():
    pipeline = [
        {'$group': {'_id': "$user_id", 'user_name': {'$first': '$user_name'}}},
        {'$project': {'user_id': '$_id', 'user_name': '$user_name', '_id': 0}},
        {'$sort': {'user_name': 1}}
    ]
    return list(USER_COLLECTION.aggregate(pipeline))

@router.get("/meters", summary="获取指定用户的所有电表列表")
def get_meters(user_id: str = Query(..., description="要查询的用户的ID")):
    query = {'user_id': user_id}
    meter_ids = USER_COLLECTION.distinct("meter_id", query)
    return [{"meter_id": meter_id} for meter_id in sorted(meter_ids)]

@router.get("/load_curve", summary="获取指定电表一个或多个日期的负荷曲线")
def get_load_curve(meter_id: str = Query(..., description="电表ID"), date: List[str] = Query(..., description="查询的日期列表, 格式 YYYY-MM-DD")):
    response_data = {}
    for date_str in date:
        try:
            start_date = datetime.strptime(date_str, "%Y-%m-%d")
            end_date = start_date + timedelta(days=1)
            query = {"meter_id": meter_id, "timestamp": {"$gte": start_date, "$lt": end_date}}
            projection = {"timestamp": 1, "load_value": 1, "_id": 0}
            cursor = USER_COLLECTION.find(query, projection).sort("timestamp", 1)
            points = [{"time": doc["timestamp"].strftime("%H:%M"), "value": doc["load_value"]} for doc in cursor]
            response_data[date_str] = points
        except ValueError:
            response_data[date_str] = {"error": "Invalid date format."}
            continue
    return response_data

@router.get("/daily_energy", summary="获取指定电表一个或多个月份的日电量数据")
def get_daily_energy(meter_id: str = Query(..., description="电表ID"), month: List[str] = Query(..., description="查询的月份列表, 格式 YYYY-MM")):
    response_data = {}
    for month_str in month:
        try:
            year, mon = map(int, month_str.split('-'))
            start_date = datetime(year, mon, 1)
            end_date = datetime(year, mon, calendar.monthrange(year, mon)[1], 23, 59, 59)
            pipeline = [
                {'$match': {'meter_id': meter_id, 'timestamp': {'$gte': start_date, '$lte': end_date}}},
                {'$group': {'_id': {'$dayOfMonth': '$timestamp'}, 'energy': {'$sum': '$load_value'}}},
                {'$sort': {'_id': 1}},
                {'$project': {'day': '$_id', 'energy': '$energy', '_id': 0}}
            ]
            response_data[month_str] = list(USER_COLLECTION.aggregate(pipeline))
        except ValueError:
            response_data[month_str] = {"error": "Invalid month format."}
            continue
    return response_data

@router.get("/available-dates", summary="获取指定电表所有存在数据的日期")
def get_available_dates(meter_id: str = Query(..., description="电表ID")):
    pipeline = [
        {'$match': {'meter_id': meter_id}},
        {'$project': {'date': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}}, '_id': 0}},
        {'$group': {'_id': '$date'}},
        {'$sort': {'_id': 1}}
    ]
    return [doc['_id'] for doc in USER_COLLECTION.aggregate(pipeline)]

@router.get("/available_months", summary="获取所有存在价格数据的月份")
def get_available_months():
    try:
        pipeline = [
            {'$project': {'month': {'$dateToString': {'format': '%Y-%m', 'date': '$datetime'}}}},
            {'$group': {'_id': '$month'}},
            {'$sort': {'_id': -1}}
        ]
        # 这里我们假设日前和实时数据的月份范围基本一致，使用日前价格集合进行查询
        months = [doc['_id'] for doc in DA_PRICE_COLLECTION.aggregate(pipeline)]
        return months
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


def get_tou_rule_for_date(date: datetime) -> Dict[str, str]:
    month = date.month
    query = {"months": month}
    rules = list(TOU_RULES_COLLECTION.find(query))
    
    time_to_period_map = {}
    for i in range(96):
        time_obj = datetime(2000, 1, 1) + timedelta(minutes=15 * i)
        time_to_period_map[time_obj.strftime("%H:%M")] = "平段"

    priority = ["高峰", "低谷", "尖峰", "深谷"]
    sorted_rules = sorted(rules, key=lambda r: priority.index(r['period_type']) if r['period_type'] in priority else -1)

    for rule in sorted_rules:
        start = datetime.strptime(rule['start_time'], '%H:%M').time()
        end_time_str = rule['end_time']
        for time_str in time_to_period_map:
            current_time = datetime.strptime(time_str, '%H:%M').time()
            if end_time_str == '24:00':
                if current_time >= start:
                    time_to_period_map[time_str] = rule['period_type']
            else:
                end = datetime.strptime(end_time_str, '%H:%M').time()
                if start <= current_time < end:
                    time_to_period_map[time_str] = rule['period_type']
    return time_to_period_map

@router.get("/price_comparison", summary="获取指定单日的日前与实时价格对比数据")
def get_price_comparison(date: str = Query(..., description="查询日期, 格式 YYYY-MM-DD")):
    try:
        start_date = datetime.strptime(date, "%Y-%m-%d")
        end_date = start_date + timedelta(days=1)
        tou_rules = get_tou_rule_for_date(start_date)

        # --- 优化：一次性查询当天所有数据 ---
        query = {"datetime": {"$gte": start_date, "$lt": end_date}}
        da_docs = list(DA_PRICE_COLLECTION.find(query))
        rt_docs = list(RT_PRICE_COLLECTION.find(query))

        # --- 优化：将列表转换为字典以便快速查找 ---
        da_price_map = {doc['datetime']: doc for doc in da_docs}
        rt_price_map = {doc['datetime']: doc for doc in rt_docs}

        chart_data, da_prices_for_stats, rt_prices_for_stats = [], [], []
        tou_stats_collector = {period: {"da": [], "rt": []} for period in set(tou_rules.values())}

        for i in range(96):
            time_obj = start_date + timedelta(minutes=15 * i)
            # --- 优化：从字典中直接获取数据，而不是查询数据库 ---
            da_doc = da_price_map.get(time_obj)
            rt_doc = rt_price_map.get(time_obj)
            
            da_price = da_doc.get('avg_clearing_price') if da_doc else None
            rt_price = rt_doc.get('avg_clearing_price') if rt_doc else None
            time_str = time_obj.strftime("%H:%M")
            period_type = tou_rules.get(time_str, "平段")
            
            chart_data.append({"time": time_str, "day_ahead_price": da_price, "real_time_price": rt_price, "period_type": period_type})
            
            if da_price is not None:
                da_prices_for_stats.append(da_price)
                if period_type in tou_stats_collector: tou_stats_collector[period_type]["da"].append(da_price)
            if rt_price is not None:
                rt_prices_for_stats.append(rt_price)
                if period_type in tou_stats_collector: tou_stats_collector[period_type]["rt"].append(rt_price)

        # --- 统计计算部分保持不变 ---
        stats = {
            "day_ahead_avg": statistics.mean(da_prices_for_stats) if da_prices_for_stats else None,
            "day_ahead_std_dev": statistics.stdev(da_prices_for_stats) if len(da_prices_for_stats) > 1 else 0,
            "day_ahead_max": max(da_prices_for_stats) if da_prices_for_stats else None,
            "day_ahead_min": min(da_prices_for_stats) if da_prices_for_stats else None,
            "real_time_avg": statistics.mean(rt_prices_for_stats) if rt_prices_for_stats else None,
            "real_time_std_dev": statistics.stdev(rt_prices_for_stats) if len(rt_prices_for_stats) > 1 else 0,
            "real_time_max": max(rt_prices_for_stats) if rt_prices_for_stats else None,
            "real_time_min": min(rt_prices_for_stats) if rt_prices_for_stats else None,
        }
        tou_stats = {}
        for period, values in tou_stats_collector.items():
            tou_stats[period] = {
                "day_ahead_avg": statistics.mean(values["da"]) if values["da"] else None,
                "real_time_avg": statistics.mean(values["rt"]) if values["rt"] else None,
            }
        flat_da_avg = tou_stats.get("平段", {}).get("day_ahead_avg")
        flat_rt_avg = tou_stats.get("平段", {}).get("real_time_avg")
        for period, values in tou_stats.items():
            if flat_da_avg and values["day_ahead_avg"] is not None: values["day_ahead_ratio"] = round(values["day_ahead_avg"] / flat_da_avg, 2)
            else: values["day_ahead_ratio"] = None
            if flat_rt_avg and values["real_time_avg"] is not None: values["real_time_ratio"] = round(values["real_time_avg"] / flat_rt_avg, 2)
            else: values["real_time_ratio"] = None
        return {"chart_data": chart_data, "stats": stats, "tou_stats": tou_stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.get("/timeslot_analysis", summary="获取指定月份、指定时段的每日价格数据")
def get_timeslot_analysis(month: str = Query(..., description="查询月份, 格式 YYYY-MM"), slot: str = Query(..., description="查询的单个时段, 格式 HH:MM")):
    try:
        year, mon = map(int, month.split('-'))
        num_days = calendar.monthrange(year, mon)[1]
        slot_hour, slot_minute = map(int, slot.split(':'))
        
        start_date = datetime(year, mon, 1)
        end_date = start_date + timedelta(days=num_days)

        # --- 优化：使用聚合查询一次性获取所有符合条件的数据 ---
        pipeline = [
            {
                '$match': {
                    'datetime': {'$gte': start_date, '$lt': end_date},
                    '$expr': {
                        '$and': [
                            {'$eq': [{'$hour': '$datetime'}, slot_hour]},
                            {'$eq': [{'$minute': '$datetime'}, slot_minute]}
                        ]
                    }
                }
            }
        ]
        da_docs = list(DA_PRICE_COLLECTION.aggregate(pipeline))
        rt_docs = list(RT_PRICE_COLLECTION.aggregate(pipeline))

        # --- 优化：转换为以“天”为键的字典以便快速查找 ---
        da_price_map = {doc['datetime'].day: doc for doc in da_docs}
        rt_price_map = {doc['datetime'].day: doc for doc in rt_docs}

        chart_data, da_prices_for_stats, rt_prices_for_stats = [], [], []
        for day in range(1, num_days + 1):
            # --- 优化：从字典中直接获取数据 ---
            da_doc = da_price_map.get(day)
            rt_doc = rt_price_map.get(day)

            da_price = da_doc.get('avg_clearing_price') if da_doc else None
            rt_price = rt_doc.get('avg_clearing_price') if rt_doc else None
            chart_data.append({"day": day, "day_ahead_price": da_price, "real_time_price": rt_price})
            
            if da_price is not None: da_prices_for_stats.append(da_price)
            if rt_price is not None: rt_prices_for_stats.append(rt_price)

        # --- 统计计算部分保持不变 ---
        stats = {
            "day_ahead_avg": statistics.mean(da_prices_for_stats) if da_prices_for_stats else None,
            "day_ahead_std_dev": statistics.stdev(da_prices_for_stats) if len(da_prices_for_stats) > 1 else 0,
            "day_ahead_max": max(da_prices_for_stats) if da_prices_for_stats else None,
            "day_ahead_min": min(da_prices_for_stats) if da_prices_for_stats else None,
            "real_time_avg": statistics.mean(rt_prices_for_stats) if rt_prices_for_stats else None,
            "real_time_std_dev": statistics.stdev(rt_prices_for_stats) if len(rt_prices_for_stats) > 1 else 0,
            "real_time_max": max(rt_prices_for_stats) if rt_prices_for_stats else None,
            "real_time_min": min(rt_prices_for_stats) if rt_prices_for_stats else None,
        }
        return {"chart_data": chart_data, "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# ##############################################################################
# 国网代购电价API (SGCC Agency Price APIs)
# ##############################################################################

@router.get("/prices/sgcc", summary="获取国网代购电价数据(分页)")
def get_sgcc_prices(page: int = 1, pageSize: int = 10):
    """
    从 price_sgcc 集合中分页获取数据文档, 并额外提供完整的图表数据。
    - **排序**: 按月份ID（_id）降序排列.
    - **分页**: 根据 page 和 pageSize 返回部分数据.
    - **投影**: 排除 `pdf_binary_data` 字段以减少响应体积.
    """
    try:
        # 获取总数
        total = PRICE_SGCC_COLLECTION.count_documents({})

        # 获取表格用的分页数据
        page_cursor = PRICE_SGCC_COLLECTION.find({}, {'pdf_binary_data': 0})
        page_cursor = page_cursor.sort('_id', -1).skip((page - 1) * pageSize).limit(pageSize)
        page_data = list(page_cursor)

        # 获取图表用的全量轻量级数据
        chart_cursor = PRICE_SGCC_COLLECTION.find(
            {},
            {
                '_id': 1, 
                'purchase_price': 1, 
                'avg_on_grid_price': 1, 
                'purchase_scale_kwh': 1
            }
        ).sort('_id', 1) # 图表数据升序
        chart_data = list(chart_cursor)

        response = {
            "total": total,
            "pageData": page_data,
            "chartData": chart_data
        }
        
        return json.loads(json_util.dumps(response))

    except Exception as e:
        print(f"[DEBUG] Error in get_sgcc_prices: {e}")
        raise HTTPException(status_code=500, detail=f"获取国网代购电价数据时出错: {str(e)}")

# ##############################################################################
# 定价模型API (Pricing Model APIs)
# ##############################################################################

@router.get("/pricing-models", summary="获取定价模型列表")
def get_pricing_models(
    package_type: str = Query(None, description="套餐类型：time_based/non_time_based"),
    enabled: bool = Query(None, description="是否启用")
):
    """
    获取定价模型列表

    Args:
        package_type: 套餐类型筛选（可选）
        enabled: 是否启用（可选）

    Returns:
        定价模型列表
    """
    try:
        models = pricing_model_service.list_pricing_models(
            package_type=package_type,
            enabled=enabled
        )
        return models
    except Exception as e:
        print(f"[DEBUG] Error in get_pricing_models: {e}")
        raise HTTPException(status_code=500, detail=f"获取定价模型列表时出错: {str(e)}")


@router.get("/pricing-models/{model_code}", summary="获取定价模型详情")
def get_pricing_model(model_code: str):
    """
    获取单个定价模型的详细信息

    Args:
        model_code: 模型代码

    Returns:
        定价模型详情
    """
    try:
        model = pricing_model_service.get_pricing_model(model_code)

        if not model:
            raise HTTPException(status_code=404, detail=f"未找到模型: {model_code}")

        return model
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Error in get_pricing_model: {e}")
        raise HTTPException(status_code=500, detail=f"获取定价模型详情时出错: {str(e)}")


@router.post("/pricing-models/{model_code}/validate", summary="验证定价配置")
def validate_pricing_config(model_code: str, data: dict = Body(...)):
    """
    验证定价配置是否符合规则

    Args:
        model_code: 模型代码
        data: 包含 pricing_config 的字典

    Returns:
        校验结果 {"valid": bool, "errors": [], "warnings": []}
    """
    try:
        pricing_config = data.get("pricing_config", {})

        result = pricing_model_service.validate_pricing_config(
            model_code=model_code,
            config=pricing_config
        )

        return result
    except Exception as e:
        print(f"[DEBUG] Error in validate_pricing_config: {e}")
        raise HTTPException(status_code=500, detail=f"验证定价配置时出错: {str(e)}")

# ##############################################################################
# 零售套餐价格计算API (Retail Package Price Calculation APIs)
# ##############################################################################

@router.post("/retail-packages/calculate-price", summary="计算套餐价格")
async def calculate_package_price(data: dict = Body(...)):
    package_id = data.get("package_id")
    date = data.get("date")
    time_period = data.get("time_period")
    volume_mwh = data.get("volume_mwh")

    service = PackageService(DATABASE)
    package = await service.get_package(package_id)
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    if package['pricing_mode'] == 'fixed_linked':
        return PricingEngine.calculate_fixed_linked_price(package, date, time_period, volume_mwh)
    elif package['pricing_mode'] == 'price_spread':
        return PricingEngine.calculate_price_spread_price(package, date, time_period, volume_mwh)
    else:
        raise HTTPException(status_code=400, detail="Invalid pricing mode")

# --- 公开路由，无需认证 ---
public_router = APIRouter(prefix="/api/v1", tags=["v1-public"])

# ##############################################################################
# 市场价格分析API (Market Price Analysis APIs)
# ##############################################################################

@router.get("/market-analysis/dashboard", summary="获取市场价格总览（Market Dashboard）")
def get_market_dashboard(date_str: str = Query(..., description="查询日期, 格式 YYYY-MM-DD")):
    """
    获取指定日期的市场价格总览数据，包括：
    - 财务KPI：VWAP、TWAP、价差
    - 风险KPI：最大/最小价差、极值价格
    - 96点时序数据：价格、电量曲线
    - 时段汇总统计：按尖峰平谷分组
    """
    try:
        start_date = datetime.strptime(date_str, "%Y-%m-%d")
        
        # 获取尖峰平谷规则
        tou_rules = get_tou_rule_for_date(start_date)

        # 使用 date_str 查询，精确获取业务日的所有96个数据点（00:15 到 24:00）
        query = {"date_str": date_str}
        da_docs = list(DA_PRICE_COLLECTION.find(query).sort("datetime", 1))
        rt_docs = list(RT_PRICE_COLLECTION.find(query).sort("datetime", 1))

        # 为了稳健合并，使用 time_str 作为key创建查找字典
        da_map = {doc['time_str']: doc for doc in da_docs}
        rt_map = {doc['time_str']: doc for doc in rt_docs}

        # 初始化数据容器和KPI计算所需的变量
        time_series = []
        da_weighted_sum, da_volume_sum, rt_weighted_sum, rt_volume_sum = 0, 0, 0, 0
        da_prices, rt_prices = [], []

        max_positive_spread = {"value": float('-inf'), "time_str": "", "period": 0}
        max_negative_spread = {"value": float('inf'), "time_str": "", "period": 0}
        max_rt_price = {"value": float('-inf'), "time_str": "", "period": 0}
        min_rt_price = {"value": float('inf'), "time_str": "", "period": 0}
        
        period_collector = {}

        # 以日前数据为基础进行遍历，保证时间的完整性
        for i, da_doc in enumerate(da_docs):
            period = i + 1
            time_str = da_doc.get("time_str")
            if not time_str:
                continue

            rt_doc = rt_map.get(time_str, {}) # 从实时数据字典中查找对应时段的数据

            # 提取价格和电量
            da_price = da_doc.get('avg_clearing_price')
            da_volume = da_doc.get('total_clearing_power', 0)
            rt_price = rt_doc.get('avg_clearing_price')
            rt_volume = rt_doc.get('total_clearing_power', 0)
            rt_wind = rt_doc.get('wind_clearing_power', 0)
            rt_solar = rt_doc.get('solar_clearing_power', 0)

            spread = (rt_price - da_price) if (rt_price is not None and da_price is not None) else None
            period_type = tou_rules.get(time_str, "平段")

            # 组装时序数据，确保 time_str 字段存在
            time_series.append({
                "period": period,
                "time": time_str, # 兼容旧版，或者用于调试
                "time_str": time_str, # 前端需要此字段
                "price_rt": rt_price,
                "price_da": da_price,
                "volume_rt": rt_volume,
                "volume_da": da_volume,
                "spread": spread,
                "period_type": period_type
            })

            # 累加用于计算KPIs
            if da_price is not None and da_volume > 0:
                da_weighted_sum += da_price * da_volume
                da_volume_sum += da_volume
                da_prices.append(da_price)

            if rt_price is not None and rt_volume > 0:
                rt_weighted_sum += rt_price * rt_volume
                rt_volume_sum += rt_volume
                rt_prices.append(rt_price)

            # 更新风险指标
            if spread is not None:
                if spread > max_positive_spread["value"]:
                    max_positive_spread.update({"value": spread, "time_str": time_str, "period": period})
                if spread < max_negative_spread["value"]:
                    max_negative_spread.update({"value": spread, "time_str": time_str, "period": period})
            if rt_price is not None:
                if rt_price > max_rt_price["value"]:
                    max_rt_price.update({"value": rt_price, "time_str": time_str, "period": period})
                if rt_price < min_rt_price["value"]:
                    min_rt_price.update({"value": rt_price, "time_str": time_str, "period": period})
            
            # 收集分时段数据
            if period_type not in period_collector:
                period_collector[period_type] = {
                    "da_weighted_sum": 0, "da_volume_sum": 0,
                    "rt_weighted_sum": 0, "rt_volume_sum": 0,
                    "rt_wind_sum": 0, "rt_solar_sum": 0, "count": 0
                }
            
            if da_price is not None and da_volume > 0:
                period_collector[period_type]["da_weighted_sum"] += da_price * da_volume
                period_collector[period_type]["da_volume_sum"] += da_volume
            if rt_price is not None and rt_volume > 0:
                period_collector[period_type]["rt_weighted_sum"] += rt_price * rt_volume
                period_collector[period_type]["rt_volume_sum"] += rt_volume
                period_collector[period_type]["rt_wind_sum"] += rt_wind
                period_collector[period_type]["rt_solar_sum"] += rt_solar
                period_collector[period_type]["count"] += 1

        # --- 后续计算逻辑保持不变 ---
        
        # 计算财务KPI
        vwap_da = da_weighted_sum / da_volume_sum if da_volume_sum > 0 else None
        vwap_rt = rt_weighted_sum / rt_volume_sum if rt_volume_sum > 0 else None
        vwap_spread = (vwap_rt - vwap_da) if (vwap_rt is not None and vwap_da is not None) else None
        twap_da = statistics.mean(da_prices) if da_prices else None
        twap_rt = statistics.mean(rt_prices) if rt_prices else None

        financial_kpis = {"vwap_rt": vwap_rt, "vwap_da": vwap_da, "vwap_spread": vwap_spread, "twap_rt": twap_rt, "twap_da": twap_da}

        # 风险KPI
        risk_kpis = {
            "max_positive_spread": max_positive_spread if max_positive_spread["value"] != float('-inf') else None,
            "max_negative_spread": max_negative_spread if max_negative_spread["value"] != float('inf') else None,
            "max_rt_price": max_rt_price if max_rt_price["value"] != float('-inf') else None,
            "min_rt_price": min_rt_price if min_rt_price["value"] != float('inf') else None
        }

        # 计算时段汇总
        period_summary = []
        period_order = ["尖峰", "高峰", "平段", "低谷", "深谷"]
        for period_name in period_order:
            if period_name not in period_collector: continue

            data = period_collector[period_name]
            vwap_da_period = data["da_weighted_sum"] / data["da_volume_sum"] if data["da_volume_sum"] > 0 else None
            vwap_rt_period = data["rt_weighted_sum"] / data["rt_volume_sum"] if data["rt_volume_sum"] > 0 else None
            vwap_spread_period = (vwap_rt_period - vwap_da_period) if (vwap_rt_period and vwap_da_period) else None
            avg_volume_rt = data["rt_volume_sum"] / data["count"] if data["count"] > 0 else None
            
            renewable_volume = data["rt_wind_sum"] + data["rt_solar_sum"]
            renewable_ratio = renewable_volume / data["rt_volume_sum"] if data["rt_volume_sum"] > 0 else None

            period_summary.append({
                "period_name": period_name, "vwap_da": vwap_da_period, "vwap_rt": vwap_rt_period,
                "vwap_spread": vwap_spread_period, "avg_volume_rt": avg_volume_rt, "renewable_ratio": renewable_ratio
            })

        return {
            "date": date_str,
            "financial_kpis": financial_kpis,
            "risk_kpis": risk_kpis,
            "time_series": time_series,
            "period_summary": period_summary
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式无效，请使用 YYYY-MM-DD 格式")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取市场总览数据时出错: {str(e)}")


@router.get("/market-analysis/day-ahead", summary="获取日前市场分析数据")
def get_day_ahead_analysis(date: str = Query(..., description="查询日期, 格式 YYYY-MM-DD")):
    """
    获取指定日期的日前市场分析数据，包括价格、总电量及各类电源的出力。
    - **查询**: 从 `day_ahead_spot_price` 集合获取数据。
    - **排序**: 按 `datetime` 升序排列。
    - **返回**: 返回原始的96个数据点列表。
    """
    try:
        # 验证日期格式
        datetime.strptime(date, "%Y-%m-%d")

        # 直接使用 date_str 进行查询
        query = {"date_str": date}
        
        # 查询并排除 _id 字段，按 datetime 排序
        docs = list(DA_PRICE_COLLECTION.find(query, {'_id': 0}).sort("datetime", 1))
        
        if not docs:
            return []
            
        return json.loads(json_util.dumps(docs))

    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式无效，请使用 YYYY-MM-DD 格式")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取日前市场分析数据时出错: {str(e)}")


@router.get("/market-analysis/real-time", summary="获取现货市场复盘数据")
def get_real_time_analysis(date: str = Query(..., description="查询日期, 格式 YYYY-MM-DD")):
    """
    获取指定日期的现货市场复盘数据，包括价格、电量、电源出力以及价格波动。
    - **查询**: 从 `real_time_spot_price` 集合获取数据。
    - **计算**: 在返回前计算价格爬坡（price_ramp）。
    - **返回**: 返回包含计算字段的96个数据点列表。
    """
    try:
        # 验证日期格式
        datetime.strptime(date, "%Y-%m-%d")

        query = {"date_str": date}
        docs = list(RT_PRICE_COLLECTION.find(query, {'_id': 0}).sort("datetime", 1))

        if not docs:
            return []

        # 计算价格爬坡
        for i in range(len(docs)):
            if i > 0 and docs[i].get('avg_clearing_price') is not None and docs[i-1].get('avg_clearing_price') is not None:
                price_ramp = docs[i]['avg_clearing_price'] - docs[i-1]['avg_clearing_price']
                docs[i]['price_ramp'] = price_ramp
            else:
                docs[i]['price_ramp'] = None # 第一个点或数据缺失时，波动为None

        return json.loads(json_util.dumps(docs))

    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式无效，请使用 YYYY-MM-DD 格式")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取现货市场复盘数据时出错: {str(e)}")


@router.get("/market-analysis/spread-attribution", summary="获取价差归因分析数据")
def get_spread_attribution_analysis(date: str = Query(..., description="查询日期, 格式 YYYY-MM-DD")):
    try:
        start_date = datetime.strptime(date, "%Y-%m-%d")
        query = {"date_str": date}

        # 1. 并行获取数据
        da_docs = list(DA_PRICE_COLLECTION.find(query, {'_id': 0}).sort("datetime", 1))
        rt_docs = list(RT_PRICE_COLLECTION.find(query, {'_id': 0}).sort("datetime", 1))

        if not da_docs or not rt_docs:
            return {"time_series": [], "systematic_bias": []}

        # 转换为字典以便快速查找
        rt_map = {doc['time_str']: doc for doc in rt_docs}

        # 2. 获取分时电价规则
        tou_rules = get_tou_rule_for_date(start_date)

        time_series = []
        period_collector = {}

        # 3. 以日前数据为基准，计算96点偏差 & 初始化聚合器
        for da_point in da_docs:
            time_str = da_point.get("time_str")
            if not time_str:
                continue

            rt_point = rt_map.get(time_str, {})

            # 计算价格偏差
            price_spread = (rt_point.get('avg_clearing_price') - da_point.get('avg_clearing_price')) \
                if rt_point.get('avg_clearing_price') is not None and da_point.get('avg_clearing_price') is not None else None

            # 计算电量偏差
            def calc_dev(key):
                return (rt_point.get(key, 0) or 0) - (da_point.get(key, 0) or 0)

            total_volume_deviation = calc_dev('total_clearing_power')
            thermal_deviation = calc_dev('thermal_clearing_power')
            hydro_deviation = calc_dev('hydro_clearing_power')
            wind_deviation = calc_dev('wind_clearing_power')
            solar_deviation = calc_dev('solar_clearing_power')
            storage_deviation = calc_dev('pumped_storage_clearing_power') + calc_dev('battery_storage_clearing_power')

            point_data = {
                "time_str": time_str,
                "price_spread": price_spread,
                "total_volume_deviation": total_volume_deviation,
                "thermal_deviation": thermal_deviation,
                "hydro_deviation": hydro_deviation,
                "wind_deviation": wind_deviation,
                "solar_deviation": solar_deviation,
                "storage_deviation": storage_deviation
            }
            time_series.append(point_data)

            # 4. 聚合数据到分时段
            period_type = tou_rules.get(time_str, "平段")
            if period_type not in period_collector:
                period_collector[period_type] = {key: [] for key in point_data if key != 'time_str'}
            
            for key, value in point_data.items():
                if key != 'time_str' and value is not None:
                    period_collector[period_type][key].append(value)

        # 5. 计算系统性偏差
        systematic_bias = []
        period_order = ["尖峰", "高峰", "平段", "低谷", "深谷"]
        for period_name in period_order:
            if period_name in period_collector:
                agg_data = {"period_name": period_name}
                for key, values in period_collector[period_name].items():
                    if values:
                        agg_data[f"avg_{key}"] = statistics.mean(values)
                    else:
                        agg_data[f"avg_{key}"] = None
                systematic_bias.append(agg_data)

        return {"time_series": time_series, "systematic_bias": systematic_bias}

    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式无效，请使用 YYYY-MM-DD 格式")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取价差归因分析数据时出错: {str(e)}")


@public_router.get("/prices/sgcc/{month}/pdf", summary="获取指定月份的国网代购电价PDF公告")
def get_sgcc_price_pdf(month: str):
    """
    根据月份ID（例如, '2024-01'）获取对应的PDF文件.
    - **查询**: 根据 `_id` 查找单个文档.
    - **返回**: 如果找到PDF，则以流式响应返回；否则返回404错误.
    """
    try:
        document = PRICE_SGCC_COLLECTION.find_one({'_id': month}, {'pdf_binary_data': 1, 'attachment_name': 1})
        if document and 'pdf_binary_data' in document and document['pdf_binary_data']:
            pdf_bytes = document['pdf_binary_data']
            print(f"[DEBUG] Found PDF for month {month}. Size: {len(pdf_bytes)} bytes.")
            attachment_name = document.get('attachment_name', f"sgcc_price_{month}.pdf")

            headers = {
                'Content-Disposition': f'inline; filename="{attachment_name}"'
            }
            return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
        else:
            print(f"[DEBUG] PDF not found or empty for month {month}.")
            raise HTTPException(status_code=404, detail=f"未找到月份 {month} 的PDF文件或文件为空.")
    except Exception as e:
        print(f"[DEBUG] Error in get_sgcc_price_pdf: {e}")
        raise HTTPException(status_code=500, detail=f"获取PDF文件时出错: {str(e)}")