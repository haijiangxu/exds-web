from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional

# Assuming the models and services will be created
# from webapp.models.retail_package import RetailPackage
# from webapp.services.package_service import PackageService
# from webapp.tools.mongo import DATABASE
# from webapp.tools.security import get_current_active_user

router = APIRouter(prefix="/api/v1/retail-packages", tags=["retail_packages"])

# Mock functions and classes to allow for file creation
class RetailPackage:
    pass

class PackageService:
    def __init__(self, db):
        pass
    async def create_package(self, package_data, status, operator):
        return {"id": "new_id", "status": status}
    async def list_packages(self, filters, page, page_size):
        return {"items": [], "total": 0}
    async def change_status(self, package_id, new_status, operator):
        return {"id": package_id, "status": new_status}

def get_current_active_user():
    return {"username": "testuser"}

DATABASE = None

@router.post("", response_model=dict)
async def create_package(
    package: RetailPackage, # This will be the pydantic model
    save_as_draft: bool = True,
    current_user: dict = Depends(get_current_active_user)
):
    """创建新套餐"""
    service = PackageService(DATABASE)
    # The package data will come from the request
    result = await service.create_package(
        package_data={},
        status="draft" if save_as_draft else "active",
        operator=current_user["username"]
    )
    return result

@router.get("", response_model=dict)
async def list_packages(
    keyword: Optional[str] = None,
    package_type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
):
    """获取套餐列表"""
    service = PackageService(DATABASE)
    result = await service.list_packages(
        filters={
            "keyword": keyword,
            "package_type": package_type,
            "status": status
        },
        page=page,
        page_size=page_size
    )
    return result

@router.post("/{package_id}/activate")
async def activate_package(
    package_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """激活套餐"""
    service = PackageService(DATABASE)
    result = await service.change_status(
        package_id=package_id,
        new_status="active",
        operator=current_user["username"]
    )
    return result