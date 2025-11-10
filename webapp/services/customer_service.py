from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from typing import Optional, List, Dict, Any
from webapp.tools.mongo import DATABASE
from webapp.models.customer import Customer, CustomerCreate, CustomerUpdate, CustomerListItem
from datetime import datetime


class CustomerService:
    """
    Service layer for customer management.
    Handles business logic for creating, retrieving, updating, and deleting customers.
    """

    def __init__(self, db):
        self.db = db
        self.collection = self.db.customers
        self._ensure_indexes()

    def _ensure_indexes(self):
        """确保数据库索引存在"""
        try:
            # 要创建的索引列表
            indexes = [
                # 1. 基础查询索引
                ([('user_name', 1)], {'name': 'idx_user_name'}),
                ([('short_name', 1)], {'name': 'idx_short_name'}),
                ([('status', 1)], {'name': 'idx_status'}),

                # 2. 组合查询索引（用于列表筛选）
                ([('status', 1), ('created_at', -1)], {'name': 'idx_status_created_at'}),
                ([('status', 1), ('user_type', 1), ('created_at', -1)], {'name': 'idx_status_user_type'}),
                ([('status', 1), ('industry', 1), ('created_at', -1)], {'name': 'idx_status_industry'}),
                ([('status', 1), ('region', 1), ('created_at', -1)], {'name': 'idx_status_region'}),

                # 3. 嵌套数据索引（用于户号和计量点查询）
                ([('utility_accounts.account_id', 1)], {'name': 'idx_account_id'}),
                ([('utility_accounts.metering_points.metering_point_id', 1)], {'name': 'idx_metering_point_id'}),
                ([('utility_accounts.metering_points.meter.meter_id', 1)], {'name': 'idx_meter_id'}),

                # 4. 时间索引
                ([('created_at', -1)], {'name': 'idx_created_at'}),
                ([('updated_at', -1)], {'name': 'idx_updated_at'}),
            ]

            existing_indexes = {idx.get('name') for idx in self.collection.list_indexes()}

            for keys, options in indexes:
                if options['name'] not in existing_indexes:
                    self.collection.create_index(keys, **options)

        except Exception as e:
            # 索引创建失败不应该阻止服务启动，记录错误即可
            print(f"创建客户索引时出错: {str(e)}")

    def create_customer(self, customer_data: dict, operator: str) -> dict:
        """
        创建新客户

        Args:
            customer_data: 客户数据
            operator: 操作人

        Returns:
            创建的客户信息

        Raises:
            ValueError: 客户名称已存在
        """
        # 检查客户名称是否已存在
        existing_customer = self.collection.find_one({
            "user_name": customer_data.get("user_name"),
            "status": {"$ne": "deleted"}
        })
        if existing_customer:
            raise ValueError(f"客户名称 '{customer_data.get('user_name')}' 已存在")

        # 检查户号是否在当前客户内重复
        utility_accounts = customer_data.get("utility_accounts", [])
        account_ids = [account.get("account_id") for account in utility_accounts]
        if len(account_ids) != len(set(account_ids)):
            raise ValueError("户号在当前客户内重复")

        # 检查计量点ID是否在户号内重复
        for account in utility_accounts:
            metering_points = account.get("metering_points", [])
            mp_ids = [mp.get("metering_point_id") for mp in metering_points]
            if len(mp_ids) != len(set(mp_ids)):
                raise ValueError(f"户号 {account.get('account_id')} 内计量点ID重复")

        customer = Customer(**customer_data)
        customer.created_by = operator
        customer.updated_by = operator

        # 准备插入文档
        doc_to_insert = customer.model_dump(by_alias=True)
        # 确保写入数据库的是ObjectId，而不是被Pydantic过早序列化为的字符串
        doc_to_insert['_id'] = customer.id

        # 插入数据库
        result = self.collection.insert_one(doc_to_insert)

        # 返回创建的客户信息
        created_customer = self.collection.find_one({"_id": result.inserted_id})
        return self._convert_to_dict(created_customer)

    def get_customer_by_id(self, customer_id: str) -> dict:
        """
        根据ID获取客户详情

        Args:
            customer_id: 客户ID

        Returns:
            客户详情

        Raises:
            ValueError: 客户不存在
        """
        if not ObjectId.is_valid(customer_id):
            raise ValueError("无效的客户ID")

        customer = self.collection.find_one({
            "_id": ObjectId(customer_id),
            "status": {"$ne": "deleted"}
        })

        if not customer:
            raise ValueError("客户不存在")

        return self._convert_to_dict(customer)

    def list_customers(self, filters: dict, page: int = 1, page_size: int = 20) -> dict:
        """
        获取客户列表

        Args:
            filters: 筛选条件
            page: 页码
            page_size: 每页大小

        Returns:
            客户列表响应
        """
        # 构建查询条件
        query = {"status": {"$ne": "deleted"}}

        # 添加筛选条件
        if filters.get("keyword"):
            keyword = filters["keyword"]
            query["$or"] = [
                {"user_name": {"$regex": keyword, "$options": "i"}},
                {"short_name": {"$regex": keyword, "$options": "i"}}
            ]

        if filters.get("user_type"):
            query["user_type"] = filters["user_type"]

        if filters.get("industry"):
            query["industry"] = filters["industry"]

        if filters.get("voltage"):
            query["voltage"] = filters["voltage"]

        if filters.get("region"):
            query["region"] = filters["region"]

        if filters.get("status"):
            query["status"] = filters["status"]

        # 计算总数
        total = self.collection.count_documents(query)

        # 分页查询
        skip = (page - 1) * page_size
        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)

        # 转换为列表项格式
        items = []
        for doc in cursor:
            account_count = len(doc.get("utility_accounts", []))
            item = CustomerListItem(
                id=str(doc["_id"]),
                user_name=doc.get("user_name", ""),
                short_name=doc.get("short_name", ""),
                user_type=doc.get("user_type"),
                industry=doc.get("industry"),
                voltage=doc.get("voltage"),
                region=doc.get("region"),
                status=doc.get("status", "active"),
                account_count=account_count,
                created_at=doc.get("created_at"),
                updated_at=doc.get("updated_at")
            )
            items.append(item.model_dump())

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items
        }

    def update_customer(self, customer_id: str, customer_data: dict, operator: str) -> dict:
        """
        更新客户信息

        Args:
            customer_id: 客户ID
            customer_data: 更新数据
            operator: 操作人

        Returns:
            更新后的客户信息

        Raises:
            ValueError: 客户不存在或客户名称已存在
        """
        if not ObjectId.is_valid(customer_id):
            raise ValueError("无效的客户ID")

        # 检查客户是否存在
        existing_customer = self.collection.find_one({
            "_id": ObjectId(customer_id),
            "status": {"$ne": "deleted"}
        })
        if not existing_customer:
            raise ValueError("客户不存在")

        # 检查客户名称是否与其他客户重复
        new_user_name = customer_data.get("user_name")
        if new_user_name and new_user_name != existing_customer.get("user_name"):
            duplicate_customer = self.collection.find_one({
                "user_name": new_user_name,
                "status": {"$ne": "deleted"},
                "_id": {"$ne": ObjectId(customer_id)}
            })
            if duplicate_customer:
                raise ValueError(f"客户名称 '{new_user_name}' 已存在")

        # 验证户号和计量点的唯一性
        if "utility_accounts" in customer_data:
            utility_accounts = customer_data["utility_accounts"]
            account_ids = [account.get("account_id") for account in utility_accounts]
            if len(account_ids) != len(set(account_ids)):
                raise ValueError("户号在当前客户内重复")

            for account in utility_accounts:
                metering_points = account.get("metering_points", [])
                mp_ids = [mp.get("metering_point_id") for mp in metering_points]
                if len(mp_ids) != len(set(mp_ids)):
                    raise ValueError(f"户号 {account.get('account_id')} 内计量点ID重复")

        # 更新数据
        update_data = customer_data.copy()
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = operator

        result = self.collection.update_one(
            {"_id": ObjectId(customer_id)},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise ValueError("客户不存在")

        # 返回更新后的客户信息
        updated_customer = self.collection.find_one({"_id": ObjectId(customer_id)})
        return self._convert_to_dict(updated_customer)

    def delete_customer(self, customer_id: str) -> None:
        """
        删除客户（软删除）

        Args:
            customer_id: 客户ID

        Raises:
            ValueError: 客户不存在
        """
        if not ObjectId.is_valid(customer_id):
            raise ValueError("无效的客户ID")

        result = self.collection.update_one(
            {"_id": ObjectId(customer_id), "status": {"$ne": "deleted"}},
            {"$set": {"status": "deleted", "updated_at": datetime.utcnow()}}
        )

        if result.matched_count == 0:
            raise ValueError("客户不存在或已删除")

    def add_utility_account(self, customer_id: str, account_data: dict, operator: str) -> dict:
        """
        为客户添加户号

        Args:
            customer_id: 客户ID
            account_data: 户号数据
            operator: 操作人

        Returns:
            更新后的客户信息

        Raises:
            ValueError: 客户不存在或户号已存在
        """
        if not ObjectId.is_valid(customer_id):
            raise ValueError("无效的客户ID")

        customer = self.collection.find_one({
            "_id": ObjectId(customer_id),
            "status": {"$ne": "deleted"}
        })
        if not customer:
            raise ValueError("客户不存在")

        # 检查户号是否已存在
        existing_accounts = customer.get("utility_accounts", [])
        account_id = account_data.get("account_id")
        for account in existing_accounts:
            if account.get("account_id") == account_id:
                raise ValueError(f"户号 '{account_id}' 已存在")

        # 添加新户号
        result = self.collection.update_one(
            {"_id": ObjectId(customer_id)},
            {
                "$push": {"utility_accounts": account_data},
                "$set": {"updated_at": datetime.utcnow(), "updated_by": operator}
            }
        )

        if result.matched_count == 0:
            raise ValueError("客户不存在")

        # 返回更新后的客户信息
        updated_customer = self.collection.find_one({"_id": ObjectId(customer_id)})
        return self._convert_to_dict(updated_customer)

    def update_utility_account(self, customer_id: str, account_id: str, account_data: dict, operator: str) -> dict:
        """
        更新户号信息

        Args:
            customer_id: 客户ID
            account_id: 户号
            account_data: 更新数据
            operator: 操作人

        Returns:
            更新后的客户信息

        Raises:
            ValueError: 客户不存在或户号不存在
        """
        if not ObjectId.is_valid(customer_id):
            raise ValueError("无效的客户ID")

        customer = self.collection.find_one({
            "_id": ObjectId(customer_id),
            "status": {"$ne": "deleted"}
        })
        if not customer:
            raise ValueError("客户不存在")

        # 查找并更新户号
        accounts = customer.get("utility_accounts", [])
        account_found = False
        for i, account in enumerate(accounts):
            if account.get("account_id") == account_id:
                # 更新户号信息
                for key, value in account_data.items():
                    if key != "account_id":  # 不允许修改户号
                        accounts[i][key] = value
                account_found = True
                break

        if not account_found:
            raise ValueError(f"户号 '{account_id}' 不存在")

        # 更新数据库
        result = self.collection.update_one(
            {"_id": ObjectId(customer_id)},
            {
                "$set": {
                    "utility_accounts": accounts,
                    "updated_at": datetime.utcnow(),
                    "updated_by": operator
                }
            }
        )

        if result.matched_count == 0:
            raise ValueError("客户不存在")

        # 返回更新后的客户信息
        updated_customer = self.collection.find_one({"_id": ObjectId(customer_id)})
        return self._convert_to_dict(updated_customer)

    def delete_utility_account(self, customer_id: str, account_id: str, operator: str) -> dict:
        """
        删除户号

        Args:
            customer_id: 客户ID
            account_id: 户号
            operator: 操作人

        Returns:
            更新后的客户信息

        Raises:
            ValueError: 客户不存在或户号不存在
        """
        if not ObjectId.is_valid(customer_id):
            raise ValueError("无效的客户ID")

        customer = self.collection.find_one({
            "_id": ObjectId(customer_id),
            "status": {"$ne": "deleted"}
        })
        if not customer:
            raise ValueError("客户不存在")

        # 删除户号
        result = self.collection.update_one(
            {"_id": ObjectId(customer_id)},
            {
                "$pull": {"utility_accounts": {"account_id": account_id}},
                "$set": {"updated_at": datetime.utcnow(), "updated_by": operator}
            }
        )

        if result.matched_count == 0:
            raise ValueError("客户不存在")

        # 返回更新后的客户信息
        updated_customer = self.collection.find_one({"_id": ObjectId(customer_id)})
        return self._convert_to_dict(updated_customer)

    def add_metering_point(self, customer_id: str, account_id: str, metering_point_data: dict, operator: str) -> dict:
        """
        为户号添加计量点

        Args:
            customer_id: 客户ID
            account_id: 户号
            metering_point_data: 计量点数据
            operator: 操作人

        Returns:
            更新后的客户信息

        Raises:
            ValueError: 客户不存在或户号不存在或计量点ID已存在
        """
        if not ObjectId.is_valid(customer_id):
            raise ValueError("无效的客户ID")

        customer = self.collection.find_one({
            "_id": ObjectId(customer_id),
            "status": {"$ne": "deleted"}
        })
        if not customer:
            raise ValueError("客户不存在")

        # 查找对应的户号
        accounts = customer.get("utility_accounts", [])
        target_account = None
        for account in accounts:
            if account.get("account_id") == account_id:
                target_account = account
                break

        if not target_account:
            raise ValueError(f"户号 '{account_id}' 不存在")

        # 检查计量点ID是否已存在
        existing_metering_points = target_account.get("metering_points", [])
        metering_point_id = metering_point_data.get("metering_point_id")
        for mp in existing_metering_points:
            if mp.get("metering_point_id") == metering_point_id:
                raise ValueError(f"计量点ID '{metering_point_id}' 已存在")

        # 添加计量点
        target_account["metering_points"].append(metering_point_data)

        # 更新客户信息
        result = self.update_customer(
            customer_id=customer_id,
            customer_data={"utility_accounts": accounts},
            operator=operator
        )
        return result

    def update_metering_point(self, customer_id: str, account_id: str, metering_point_id: str, metering_point_data: dict, operator: str) -> dict:
        """
        更新计量点信息

        Args:
            customer_id: 客户ID
            account_id: 户号
            metering_point_id: 计量点ID
            metering_point_data: 更新数据
            operator: 操作人

        Returns:
            更新后的客户信息

        Raises:
            ValueError: 客户不存在或户号不存在或计量点不存在
        """
        if not ObjectId.is_valid(customer_id):
            raise ValueError("无效的客户ID")

        customer = self.collection.find_one({
            "_id": ObjectId(customer_id),
            "status": {"$ne": "deleted"}
        })
        if not customer:
            raise ValueError("客户不存在")

        # 查找对应的户号
        accounts = customer.get("utility_accounts", [])
        target_account = None
        for account in accounts:
            if account.get("account_id") == account_id:
                target_account = account
                break

        if not target_account:
            raise ValueError(f"户号 '{account_id}' 不存在")

        # 查找并更新计量点
        metering_points = target_account.get("metering_points", [])
        metering_point_found = False
        for i, mp in enumerate(metering_points):
            if mp.get("metering_point_id") == metering_point_id:
                # 更新计量点信息
                for key, value in metering_point_data.items():
                    if key != "metering_point_id":  # 不允许修改计量点ID
                        metering_points[i][key] = value
                metering_point_found = True
                break

        if not metering_point_found:
            raise ValueError(f"计量点ID '{metering_point_id}' 不存在")

        # 更新客户信息
        result = self.update_customer(
            customer_id=customer_id,
            customer_data={"utility_accounts": accounts},
            operator=operator
        )
        return result

    def delete_metering_point(self, customer_id: str, account_id: str, metering_point_id: str, operator: str) -> dict:
        """
        删除计量点

        Args:
            customer_id: 客户ID
            account_id: 户号
            metering_point_id: 计量点ID
            operator: 操作人

        Returns:
            更新后的客户信息

        Raises:
            ValueError: 客户不存在或户号不存在或计量点不存在
        """
        if not ObjectId.is_valid(customer_id):
            raise ValueError("无效的客户ID")

        customer = self.collection.find_one({
            "_id": ObjectId(customer_id),
            "status": {"$ne": "deleted"}
        })
        if not customer:
            raise ValueError("客户不存在")

        # 查找对应的户号
        accounts = customer.get("utility_accounts", [])
        target_account = None
        for account in accounts:
            if account.get("account_id") == account_id:
                target_account = account
                break

        if not target_account:
            raise ValueError(f"户号 '{account_id}' 不存在")

        # 删除计量点
        metering_points = target_account.get("metering_points", [])
        original_length = len(metering_points)
        metering_points = [mp for mp in metering_points if mp.get("metering_point_id") != metering_point_id]

        if len(metering_points) == original_length:
            raise ValueError(f"计量点ID '{metering_point_id}' 不存在")

        # 更新户号的计量点列表
        for account in accounts:
            if account.get("account_id") == account_id:
                account["metering_points"] = metering_points
                break

        # 更新客户信息
        result = self.update_customer(
            customer_id=customer_id,
            customer_data={"utility_accounts": accounts},
            operator=operator
        )
        return result

    def get_meter_info(self, meter_id: str) -> dict:
        """
        获取电表信息（用于自动填充）

        Args:
            meter_id: 电表资产号

        Returns:
            电表信息
        """
        pipeline = [
            {"$match": {"status": {"$ne": "deleted"}}},
            {"$unwind": "$utility_accounts"},
            {"$unwind": "$utility_accounts.metering_points"},
            {"$match": {"utility_accounts.metering_points.meter.meter_id": meter_id}},
            {"$group": {
                "_id": "$utility_accounts.metering_points.meter.meter_id",
                "multiplier": {"$first": "$utility_accounts.metering_points.meter.multiplier"},
                "meter_type": {"$first": "$utility_accounts.metering_points.meter.meter_type"},
                "installation_date": {"$first": "$utility_accounts.metering_points.meter.installation_date"},
                "usage_count": {"$sum": 1}
            }}
        ]

        result = list(self.collection.aggregate(pipeline))

        if result:
            return {
                "meter_id": result[0]["_id"],
                "multiplier": result[0]["multiplier"],
                "meter_type": result[0]["meter_type"],
                "installation_date": result[0]["installation_date"],
                "usage_count": result[0]["usage_count"]
            }

        return {}

    def sync_update_meter(self, meter_id: str, update_data: dict, sync_all: bool = True, operator: str = None) -> dict:
        """
        同步更新电表信息

        Args:
            meter_id: 电表资产号
            update_data: 更新数据
            sync_all: 是否同步更新所有计量点
            operator: 操作人

        Returns:
            更新结果
        """
        # 构建更新条件
        match_condition = {
            "status": {"$ne": "deleted"},
            "utility_accounts.metering_points.meter.meter_id": meter_id
        }

        if sync_all:
            # 更新所有匹配的计量点
            update_fields = {}
            for key, value in update_data.items():
                update_fields[f"utility_accounts.$[].metering_points.$[elem].meter.{key}"] = value

            result = self.collection.update_many(
                match_condition,
                {
                    "$set": {
                        **update_fields,
                        "updated_at": datetime.utcnow(),
                        "updated_by": operator
                    }
                },
                array_filters=[{"elem.meter.meter_id": meter_id}]
            )

            return {
                "matched_count": result.matched_count,
                "modified_count": result.modified_count,
                "message": f"成功更新 {result.modified_count} 个计量点的电表信息"
            }
        else:
            # 这里可以根据需要实现单个更新的逻辑
            # 目前先返回全部更新的结果
            return self.sync_update_meter(meter_id, update_data, True, operator)

    def _convert_to_dict(self, doc: Dict[str, Any]) -> dict:
        """将MongoDB文档转换为字典"""
        if not doc:
            return {}

        # 转换ObjectId为字符串
        result = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                if key == "_id":
                    result["id"] = str(value)  # 将_id转换为id
                else:
                    result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            else:
                result[key] = value

        return result