from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from webapp.tools.mongo import DATABASE
from webapp.models.retail_package import RetailPackage, RetailPackageListItem, ValidationResult
from datetime import datetime


class PackageService:
    """
    Service layer for retail package management.
    Handles business logic for creating, retrieving,updating, and deleting packages.
    """

    # 状态转换矩阵
    STATE_TRANSITIONS = {
        "draft": ["active"],           # 草稿可以激活
        "active": ["archived"],        # 生效可以归档
        "archived": []                 # 归档不能转换到其他状态
    }

    def __init__(self, db):
        self.db = db
        self.collection = self.db.retail_packages

    def create_package(self, package_data: dict, operator: str, status: str = "draft") -> dict:
        """
        创建新的零售套餐

        Args:
            package_data: 套餐数据
            operator: 操作人
            status: 状态（draft 或 active）

        Returns:
            创建的套餐信息

        Raises:
            ValueError: 套餐名称已存在
        """
        package = RetailPackage(**package_data)
        package.created_by = operator
        package.updated_by = operator
        package.status = status

        # 价格配置校验（使用新的统一校验）
        if package.model_code and package.pricing_config:
            from webapp.services.pricing_model_service import pricing_model_service

            validation_result = pricing_model_service.validate_pricing_config(
                model_code=package.model_code,
                config=package.pricing_config
            )

            if not validation_result.get("valid"):
                # 校验失败，但我们仍允许保存为草稿
                package.validation = ValidationResult(
                    price_ratio_compliant=False,
                    warnings=validation_result.get("errors", []) + validation_result.get("warnings", [])
                )
            elif validation_result.get("warnings"):
                # 校验通过但有警告
                package.validation = ValidationResult(
                    price_ratio_compliant=True,
                    warnings=validation_result.get("warnings", [])
                )

        doc_to_insert = package.dict(by_alias=True)
        # 确保写入数据库的是ObjectId，而不是被Pydantic过早序列化为的字符串
        doc_to_insert['_id'] = package.id

        # 尝试插入，捕获名称重复错误
        try:
            insert_result = self.collection.insert_one(doc_to_insert)
        except DuplicateKeyError:
            raise ValueError(f"套餐名称已存在: {package.package_name}")

        return {
            "id": str(insert_result.inserted_id),
            "status": package.status,
            "validation": package.validation.dict() if package.validation else None,
            "created_at": package.created_at.isoformat()
        }

    def list_packages(self, filters: dict, page: int, page_size: int) -> dict:
        """
        Retrieves a paginated list of retail packages.
        """
        query = {}
        if filters.get("keyword"):
            query["package_name"] = {"$regex": filters["keyword"], "$options": "i"}
        if filters.get("package_type"):
            query["package_type"] = filters["package_type"]
        if filters.get("is_green_power"):
            # 将字符串 "true"/"false" 转换为布尔值
            is_green_power_str = filters["is_green_power"].lower()
            if is_green_power_str == "true":
                query["is_green_power"] = True
            elif is_green_power_str == "false":
                query["is_green_power"] = False
        if filters.get("model_code"):
            query["model_code"] = filters["model_code"]
        if filters.get("status"):
            query["status"] = filters["status"]

        total = self.collection.count_documents(query)

        cursor = self.collection.find(query).skip((page - 1) * page_size).limit(page_size)

        items = []
        for doc in cursor:
            # 构建列表项数据
            list_item_data = {
                "_id": doc["_id"],
                "package_name": doc.get("package_name"),
                "package_type": doc.get("package_type"),
                "model_code": doc.get("model_code"),
                "is_green_power": doc.get("is_green_power", False),
                "status": doc.get("status"),
                "created_at": doc.get("created_at"),
                "updated_at": doc.get("updated_at")
            }

            # Use the list item model for lighter payload
            list_item = RetailPackageListItem(**list_item_data)
            # 使用 by_alias=False 确保输出 id 而不是 _id
            items.append(list_item.dict(by_alias=False))

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items
        }

    def change_status(self, package_id: str, new_status: str, operator: str) -> dict:
        """
        变更套餐状态

        Args:
            package_id: 套餐ID
            new_status: 目标状态
            operator: 操作人

        Returns:
            更新后的状态信息

        Raises:
            ValueError: 状态转换不合法或套餐不存在
        """
        # 1. 获取当前套餐
        try:
            existing_doc = self.collection.find_one({"_id": ObjectId(package_id)})
        except Exception as e:
            raise ValueError(f"无效的套餐ID: {package_id}")

        if not existing_doc:
            raise ValueError(f"套餐不存在: {package_id}")

        current_status = existing_doc.get("status")

        # 2. 校验状态转换是否合法
        if new_status not in self.STATE_TRANSITIONS.get(current_status, []):
            raise ValueError(
                f"不允许的状态转换: {current_status} -> {new_status}。"
                f"当前状态 '{current_status}' 只能转换到: "
                f"{self.STATE_TRANSITIONS.get(current_status, [])}"
            )

        # 3. 准备更新字段
        update_fields = {
            "status": new_status,
            "updated_by": operator,
            "updated_at": datetime.utcnow()
        }

        # 记录状态变更时间
        if new_status == "active":
            update_fields["activated_at"] = datetime.utcnow()
        elif new_status == "archived":
            update_fields["archived_at"] = datetime.utcnow()

        # 4. 执行更新
        result = self.collection.update_one(
            {"_id": ObjectId(package_id)},
            {"$set": update_fields}
        )

        if result.matched_count == 0:
            raise ValueError(f"更新失败: {package_id}")

        # 5. 返回结果
        return {
            "id": package_id,
            "status": new_status,
            "updated_at": update_fields["updated_at"].isoformat(),
            f"{new_status}_at": update_fields.get(
                f"{new_status}_at",
                update_fields["updated_at"]
            ).isoformat()
        }

    def get_package_by_id(self, package_id: str) -> dict:
        """
        根据ID获取套餐详情

        Args:
            package_id: 套餐ID

        Returns:
            套餐完整信息字典

        Raises:
            ValueError: 套餐不存在或ID无效
        """
        try:
            doc = self.collection.find_one({"_id": ObjectId(package_id)})
        except Exception as e:
            raise ValueError(f"无效的套餐ID: {package_id}")

        if not doc:
            raise ValueError(f"套餐不存在: {package_id}")

        # 将 _id 转换为 id (前端期望的字段名)
        doc["id"] = str(doc.pop("_id"))
        return doc

    def update_package(self, package_id: str, package_data: dict, operator: str) -> dict:
        """
        更新套餐

        Args:
            package_id: 套餐ID
            package_data: 更新的数据
            operator: 操作人

        Returns:
            更新后的套餐信息

        Raises:
            ValueError: 套餐不存在、状态不允许更新、名称冲突、ID无效
        """
        # 1. 检查套餐是否存在
        try:
            existing_doc = self.collection.find_one({"_id": ObjectId(package_id)})
        except Exception as e:
            raise ValueError(f"无效的套餐ID: {package_id}")

        if not existing_doc:
            raise ValueError(f"套餐不存在: {package_id}")

        # 2. 状态机校验：只有草稿状态才能编辑
        if existing_doc.get("status") != "draft":
            raise ValueError("只有草稿状态的套餐才能被编辑")

        # 3. 检查名称冲突（如果修改了名称）
        new_name = package_data.get("package_name")
        if new_name and new_name != existing_doc.get("package_name"):
            existing_name = self.collection.find_one({
                "package_name": new_name,
                "_id": {"$ne": ObjectId(package_id)}
            })
            if existing_name:
                raise ValueError("套餐名称已存在")

        # 4. 更新元数据
        package_data["updated_by"] = operator
        package_data["updated_at"] = datetime.utcnow()

        # 5. 价格配置校验（使用新的统一校验）
        model_code = package_data.get("model_code")
        pricing_config = package_data.get("pricing_config")

        if model_code and pricing_config:
            from webapp.services.pricing_model_service import pricing_model_service

            validation_result = pricing_model_service.validate_pricing_config(
                model_code=model_code,
                config=pricing_config
            )

            if not validation_result.get("valid"):
                # 校验失败，但我们仍允许保存为草稿
                from webapp.models.retail_package import ValidationResult
                package_data["validation"] = ValidationResult(
                    price_ratio_compliant=False,
                    warnings=validation_result.get("errors", []) + validation_result.get("warnings", [])
                ).dict()
            elif validation_result.get("warnings"):
                # 校验通过但有警告
                from webapp.models.retail_package import ValidationResult
                package_data["validation"] = ValidationResult(
                    price_ratio_compliant=True,
                    warnings=validation_result.get("warnings", [])
                ).dict()

        # 6. 执行更新
        try:
            result = self.collection.update_one(
                {"_id": ObjectId(package_id)},
                {"$set": package_data}
            )
        except DuplicateKeyError:
            raise ValueError("套餐名称已存在")

        if result.matched_count == 0:
            raise ValueError(f"更新失败: {package_id}")

        # 7. 返回更新后的数据
        return self.get_package_by_id(package_id)

    def delete_package(self, package_id: str) -> None:
        """
        删除套餐（仅草稿状态）

        Args:
            package_id: 套餐ID

        Raises:
            ValueError: 套餐不存在、状态不允许删除、ID无效
        """
        # 1. 检查套餐是否存在
        try:
            existing_doc = self.collection.find_one({"_id": ObjectId(package_id)})
        except Exception as e:
            raise ValueError(f"无效的套餐ID: {package_id}")

        if not existing_doc:
            raise ValueError(f"套餐不存在: {package_id}")

        # 2. 状态机校验：只有草稿状态才能删除
        if existing_doc.get("status") != "draft":
            raise ValueError("只有草稿状态的套餐才能被删除")

        # 3. 执行删除
        result = self.collection.delete_one({"_id": ObjectId(package_id)})

        if result.deleted_count == 0:
            raise ValueError(f"删除失败: {package_id}")

    def copy_package(self, package_id: str, operator: str) -> dict:
        """
        复制套餐

        Args:
            package_id: 要复制的套餐ID
            operator: 操作人

        Returns:
            新创建的套餐信息

        Raises:
            ValueError: 套餐不存在或ID无效
        """
        # 1. 获取原套餐
        try:
            original_doc = self.collection.find_one({"_id": ObjectId(package_id)})
        except Exception as e:
            raise ValueError(f"无效的套餐ID: {package_id}")

        if not original_doc:
            raise ValueError(f"套餐不存在: {package_id}")

        # 2. 创建副本数据
        new_package_data = dict(original_doc)

        # 移除不应复制的字段
        fields_to_remove = [
            "_id", "created_at", "updated_at", "created_by", "updated_by",
            "activated_at", "archived_at"
        ]
        for field in fields_to_remove:
            new_package_data.pop(field, None)

        # 3. 生成新的套餐名称（避免冲突）
        original_name = original_doc.get("package_name", "")
        new_name = f"{original_name}_副本"

        # 如果新名称也存在，追加数字后缀
        counter = 1
        while self.collection.find_one({"package_name": new_name}):
            counter += 1
            new_name = f"{original_name}_副本{counter}"

        new_package_data["package_name"] = new_name

        # 4. 设置为草稿状态
        new_package_data["status"] = "draft"

        # 5. 使用create_package方法创建新套餐
        return self.create_package(
            package_data=new_package_data,
            operator=operator,
            status="draft"
        )