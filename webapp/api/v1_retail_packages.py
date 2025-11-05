from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Optional

from webapp.models.retail_package import RetailPackage, PackageListResponse, CustomPrices
from webapp.services.package_service import PackageService
from webapp.services.pricing_engine import PricingEngine
from webapp.tools.mongo import DATABASE
# Corrected import path for the user dependency
from webapp.tools.security import get_current_active_user, User

router = APIRouter(prefix="/api/v1/retail-packages", tags=["Retail Packages"])

@router.post("", response_model=dict)
async def create_package(
    package: RetailPackage,
    save_as_draft: bool = True,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new retail package."""
    service = PackageService(DATABASE)
    result = await service.create_package(
        package_data=package.dict(exclude_unset=True),
        status="draft" if save_as_draft else "active",
        operator=current_user.username
    )
    return result

@router.put("/{package_id}", response_model=dict)
async def update_package(
    package_id: str,
    package: RetailPackage,
    current_user: User = Depends(get_current_active_user)
):
    """Update an existing retail package."""
    service = PackageService(DATABASE)
    result = await service.update_package(
        package_id=package_id,
        package_data=package.dict(exclude_unset=True),
        operator=current_user.username
    )
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])
    return result

@router.post("/{package_id}/copy", response_model=dict)
async def copy_package(
    package_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Copy an existing retail package."""
    service = PackageService(DATABASE)
    result = await service.copy_package(
        package_id=package_id,
        operator=current_user.username
    )
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])
    return result

@router.get("", response_model=PackageListResponse)
async def list_packages(
    keyword: Optional[str] = None,
    package_type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_active_user)
):
    """Get a list of retail packages."""
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

@router.post("/{package_id}/activate", response_model=dict)
async def activate_package(
    package_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Activate a retail package."""
    service = PackageService(DATABASE)
    result = await service.change_status(
        package_id=package_id,
        new_status="active",
        operator=current_user.username
    )
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])
    return result

@router.post("/{package_id}/archive", response_model=dict)
async def archive_package(
    package_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Archive a retail package."""
    service = PackageService(DATABASE)
    result = await service.change_status(
        package_id=package_id,
        new_status="archived",
        operator=current_user.username
    )
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])
    return result