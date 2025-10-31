
import os
import tempfile
import shutil
from fastapi import APIRouter, Query, HTTPException, File, UploadFile, Form, Response
from webapp.tools.mongo import DATABASE
from typing import List, Dict
from datetime import datetime, timedelta
import calendar
import statistics
from bson import json_util
import json

# 创建一个API路由器
router = APIRouter(prefix="/api/v1", tags=["v1"])

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


# --- 公开路由，无需认证 ---
public_router = APIRouter(prefix="/api/v1", tags=["v1-public"])

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
