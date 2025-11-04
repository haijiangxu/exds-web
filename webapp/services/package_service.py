from webapp.tools.mongo import DATABASE
from bson import ObjectId

class PackageService:
    def __init__(self, db):
        self.db = db
        self.collection = self.db.get_collection("retail_packages")

    async def create_package(self, package_data: dict, status: str, operator: str) -> dict:
        package_data["status"] = status
        package_data["created_by"] = operator
        package_data["created_at"] = datetime.utcnow()
        package_data["updated_at"] = datetime.utcnow()

        # This is a simplified version. In a real scenario, you would handle DB exceptions.
        result = await self.collection.insert_one(package_data)
        return {"id": str(result.inserted_id), "status": status}

    async def list_packages(self, filters: dict, page: int, page_size: int) -> dict:
        query = {}
        if filters.get("keyword"):
            query["package_name"] = {"$regex": filters["keyword"], "$options": "i"}
        if filters.get("package_type"):
            query["package_type"] = filters["package_type"]
        if filters.get("status"):
            query["status"] = filters["status"]

        total = await self.collection.count_documents(query)
        items = await self.collection.find(query).skip((page - 1) * page_size).limit(page_size).to_list(length=page_size)
        
        # Convert ObjectId to string for JSON serialization
        for item in items:
            item["_id"] = str(item["_id"])

        return {"items": items, "total": total, "page": page, "page_size": page_size}

    async def change_status(self, package_id: str, new_status: str, operator: str) -> dict:
        update_data = {
            "$set": {
                "status": new_status,
                "updated_at": datetime.utcnow(),
                "updated_by": operator
            }
        }
        if new_status == "active":
            update_data["$set"]["activated_at"] = datetime.utcnow()
        elif new_status == "archived":
            update_data["$set"]["archived_at"] = datetime.utcnow()

        await self.collection.update_one({"_id": ObjectId(package_id)}, update_data)
        return {"id": package_id, "status": new_status}