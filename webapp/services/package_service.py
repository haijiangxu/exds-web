from bson import ObjectId
from webapp.tools.mongo import DATABASE
from webapp.models.retail_package import RetailPackage, RetailPackageListItem
from datetime import datetime

class PackageService:
    """
    Service layer for retail package management.
    Handles business logic for creating, retrieving,updating, and deleting packages.
    """
    def __init__(self, db):
        self.db = db
        self.collection = self.db.retail_packages

    def create_package(self, package_data: dict, operator: str, status: str = "draft") -> dict:
        """
        Creates a new retail package.
        """
        package = RetailPackage(**package_data)
        package.created_by = operator
        package.updated_by = operator
        package.status = status
        
        # TODO: Add validation logic from pricing_engine
        
        insert_result = self.collection.insert_one(package.dict(by_alias=True))
        
        return {
            "id": str(insert_result.inserted_id),
            "status": package.status,
            "validation": package.validation.dict(),
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
        if filters.get("status"):
            query["status"] = filters["status"]

        total = self.collection.count_documents(query)
        
        cursor = self.collection.find(query).skip((page - 1) * page_size).limit(page_size)
        
        items = []
        for doc in cursor:
            # Use the list item model for lighter payload
            list_item = RetailPackageListItem(**doc)
            items.append(list_item.dict())

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items
        }

    def change_status(self, package_id: str, new_status: str, operator: str) -> dict:
        """
        Changes the status of a package (e.g., activate, archive).
        """
        update_fields = {
            "status": new_status,
            "updated_by": operator,
            "updated_at": datetime.utcnow()
        }
        if new_status == "active":
            update_fields["activated_at"] = datetime.utcnow()
        elif new_status == "archived":
            update_fields["archived_at"] = datetime.utcnow()

        result = self.collection.update_one(
            {"_id": ObjectId(package_id)},
            {"$set": update_fields}
        )

        if result.matched_count == 0:
            return {"error": "Package not found"}

        return {
            "id": package_id,
            "status": new_status,
            f"{new_status}_at": update_fields.get(f"{new_status}_at", datetime.utcnow()).isoformat()
        }