from bson import ObjectId
from typing import Optional, Dict, Any
from webapp.tools.mongo import DATABASE
from webapp.models.contract import (
    Contract, ContractCreate, ContractListItem, calculate_contract_status
)
from datetime import datetime


class ContractService:
    """
    Service layer for contract management.
    Handles business logic for creating, retrieving, updating, and deleting contracts.
    """

    def __init__(self, db):
        self.db = db
        self.collection = self.db.retail_contracts
        self._ensure_indexes()

    def _ensure_indexes(self):
        """确保数据库索引存在"""
        try:
            # 要创建的索引列表
            indexes = [
                # 1. 基础查询索引
                ([('package_name', 1)], {'name': 'idx_package_name'}),
                ([('customer_name', 1)], {'name': 'idx_customer_name'}),
                ([('purchase_start_month', 1)], {'name': 'idx_purchase_start_month'}),
                ([('purchase_end_month', 1)], {'name': 'idx_purchase_end_month'}),

                # 2. 关联查询索引
                ([('package_id', 1)], {'name': 'idx_package_id'}),
                ([('customer_id', 1)], {'name': 'idx_customer_id'}),

                # 3. 组合查询索引（优化筛选查询）
                ([('package_name', 1), ('purchase_start_month', -1)],
                 {'name': 'idx_package_start'}),
                ([('customer_name', 1), ('purchase_start_month', -1)],
                 {'name': 'idx_customer_start'}),

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
            print(f"创建合同索引时出错: {str(e)}")

    def create_contract(self, contract_data: dict, operator: str) -> dict:
        """
        创建新合同

        Args:
            contract_data: 合同数据
            operator: 操作人

        Returns:
            创建的合同信息

        Raises:
            ValueError: 数据校验失败或关联数据不存在
        """
        # 1. 验证套餐存在且状态为 active
        package_id = contract_data.get("package_id")
        if not ObjectId.is_valid(package_id):
            raise ValueError("无效的套餐ID")

        package = self.db.retail_packages.find_one({
            "_id": ObjectId(package_id),
            "status": "active"
        })
        if not package:
            raise ValueError(f"套餐不存在或状态不是已生效")

        # 2. 验证客户存在且状态为 active
        customer_id = contract_data.get("customer_id")
        if not ObjectId.is_valid(customer_id):
            raise ValueError("无效的客户ID")

        customer = self.db.customers.find_one({
            "_id": ObjectId(customer_id),
            "status": "active"
        })
        if not customer:
            raise ValueError(f"客户不存在或状态不是正常")

        # 3. 验证购电结束月份 >= 购电开始月份（Pydantic 模型已验证）
        # 4. 创建合同对象
        contract = Contract(**contract_data)
        contract.created_by = operator
        contract.updated_by = operator
        contract.created_at = datetime.utcnow()
        contract.updated_at = datetime.utcnow()

        # 5. 插入数据库
        result = self.collection.insert_one(contract.model_dump(by_alias=True, exclude_unset=True))

        # 6. 返回创建的合同信息（包含虚拟状态字段）
        created_contract = self.collection.find_one({"_id": result.inserted_id})
        return self._convert_to_dict_with_status(created_contract)

    def get_contract_by_id(self, contract_id: str) -> dict:
        """
        根据ID获取合同详情

        Args:
            contract_id: 合同ID

        Returns:
            合同详情（包含虚拟状态字段）

        Raises:
            ValueError: 合同不存在
        """
        if not ObjectId.is_valid(contract_id):
            raise ValueError("无效的合同ID")

        contract = self.collection.find_one({"_id": ObjectId(contract_id)})

        if not contract:
            raise ValueError("合同不存在")

        return self._convert_to_dict_with_status(contract)

    def list_contracts(self, filters: dict, page: int = 1, page_size: int = 20) -> dict:
        """
        获取合同列表

        Args:
            filters: 筛选条件
            page: 页码
            page_size: 每页大小

        Returns:
            合同列表响应（包含虚拟状态字段）
        """
        # 构建查询条件
        query = {}

        # 添加筛选条件
        if filters.get("package_name"):
            query["package_name"] = {"$regex": filters["package_name"], "$options": "i"}

        if filters.get("customer_name"):
            query["customer_name"] = {"$regex": filters["customer_name"], "$options": "i"}

        if filters.get("purchase_start_month"):
            query["purchase_start_month"] = {"$gte": filters["purchase_start_month"]}

        if filters.get("purchase_end_month"):
            query["purchase_end_month"] = {"$lte": filters["purchase_end_month"]}

        # 注意：status 是虚拟字段，需要在查询后过滤
        status_filter = filters.get("status")

        # 计算总数（状态筛选前）
        total_before_status = self.collection.count_documents(query)

        # 分页查询
        skip = (page - 1) * page_size
        # 如果有状态筛选，需要多取一些数据以便过滤后仍能满足分页要求
        # 为简化实现，这里先取所有数据再过滤（生产环境可优化）
        if status_filter:
            cursor = self.collection.find(query).sort("created_at", -1)
        else:
            cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)

        # 转换为列表项格式（计算虚拟状态）
        items = []
        for doc in cursor:
            # 计算虚拟状态
            status = calculate_contract_status(
                doc.get("purchase_start_month"),
                doc.get("purchase_end_month")
            )

            # 如果有状态筛选，进行过滤
            if status_filter and status != status_filter:
                continue

            item = ContractListItem(
                id=str(doc["_id"]),
                package_name=doc.get("package_name", ""),
                customer_name=doc.get("customer_name", ""),
                purchasing_electricity_quantity=doc.get("purchasing_electricity_quantity", 0),
                purchase_start_month=doc.get("purchase_start_month"),
                purchase_end_month=doc.get("purchase_end_month"),
                status=status,
                created_at=doc.get("created_at"),
                updated_at=doc.get("updated_at")
            )
            items.append(item.model_dump())

        # 如果有状态筛选，进行分页
        if status_filter:
            total = len(items)
            items = items[skip:skip + page_size]
        else:
            total = total_before_status

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items
        }

    def update_contract(self, contract_id: str, contract_data: dict, operator: str) -> dict:
        """
        更新合同（仅待生效状态）

        Args:
            contract_id: 合同ID
            contract_data: 更新数据
            operator: 操作人

        Returns:
            更新后的合同信息

        Raises:
            ValueError: 合同不存在或状态不允许编辑
        """
        if not ObjectId.is_valid(contract_id):
            raise ValueError("无效的合同ID")

        # 1. 查询现有合同
        existing_contract = self.collection.find_one({"_id": ObjectId(contract_id)})
        if not existing_contract:
            raise ValueError("合同不存在")

        # 2. 计算当前状态
        current_status = calculate_contract_status(
            existing_contract.get("purchase_start_month"),
            existing_contract.get("purchase_end_month")
        )

        # 3. 如果状态不是 pending，返回错误
        if current_status != "pending":
            raise ValueError(f"只能编辑待生效状态的合同，当前状态为：{current_status}")

        # 4. 验证套餐和客户存在性（如果有更新）
        if "package_id" in contract_data:
            package_id = contract_data.get("package_id")
            if not ObjectId.is_valid(package_id):
                raise ValueError("无效的套餐ID")

            package = self.db.retail_packages.find_one({
                "_id": ObjectId(package_id),
                "status": "active"
            })
            if not package:
                raise ValueError("套餐不存在或状态不是已生效")

        if "customer_id" in contract_data:
            customer_id = contract_data.get("customer_id")
            if not ObjectId.is_valid(customer_id):
                raise ValueError("无效的客户ID")

            customer = self.db.customers.find_one({
                "_id": ObjectId(customer_id),
                "status": "active"
            })
            if not customer:
                raise ValueError("客户不存在或状态不是正常")

        # 5. 更新审计字段
        update_data = contract_data.copy()
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = operator

        # 6. 执行更新
        result = self.collection.update_one(
            {"_id": ObjectId(contract_id)},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise ValueError("合同不存在")

        # 7. 返回更新后的合同
        updated_contract = self.collection.find_one({"_id": ObjectId(contract_id)})
        return self._convert_to_dict_with_status(updated_contract)

    def delete_contract(self, contract_id: str) -> None:
        """
        删除合同（仅待生效状态）

        Args:
            contract_id: 合同ID

        Raises:
            ValueError: 合同不存在或状态不允许删除
        """
        if not ObjectId.is_valid(contract_id):
            raise ValueError("无效的合同ID")

        # 1. 查询现有合同
        existing_contract = self.collection.find_one({"_id": ObjectId(contract_id)})
        if not existing_contract:
            raise ValueError("合同不存在")

        # 2. 计算当前状态
        current_status = calculate_contract_status(
            existing_contract.get("purchase_start_month"),
            existing_contract.get("purchase_end_month")
        )

        # 3. 如果状态不是 pending，返回错误
        if current_status != "pending":
            raise ValueError(f"只能删除待生效状态的合同，当前状态为：{current_status}")

        # 4. 执行删除（硬删除）
        result = self.collection.delete_one({"_id": ObjectId(contract_id)})

        if result.deleted_count == 0:
            raise ValueError("合同不存在")

    def _convert_to_dict_with_status(self, doc: Dict[str, Any]) -> dict:
        """
        将MongoDB文档转换为字典，并添加虚拟状态字段

        Args:
            doc: MongoDB文档

        Returns:
            包含虚拟状态的字典
        """
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
            else:
                result[key] = value

        # 计算并添加虚拟状态字段
        if "purchase_start_month" in doc and "purchase_end_month" in doc:
            result["status"] = calculate_contract_status(
                doc["purchase_start_month"],
                doc["purchase_end_month"]
            )

        return result
