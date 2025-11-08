from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Optional

from webapp.models.retail_package import RetailPackage, PackageListResponse
from webapp.services.package_service import PackageService
from webapp.services.pricing_engine import PricingEngine
from webapp.tools.mongo import DATABASE
# Corrected import path for the user dependency
from webapp.tools.security import get_current_active_user, User

router = APIRouter(prefix="/retail-packages", tags=["Retail Packages"])

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_package(
    package: RetailPackage,
    save_as_draft: bool = True,
    current_user: User = Depends(get_current_active_user)
):
    """创建新的零售套餐"""
    service = PackageService(DATABASE)
    try:
        result = service.create_package(
            package_data=package.dict(exclude_unset=True),
            status="draft" if save_as_draft else "active",
            operator=current_user.username
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "名称已存在" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

@router.put("/{package_id}", response_model=dict)
async def update_package(
    package_id: str,
    package: RetailPackage,
    current_user: User = Depends(get_current_active_user)
):
    """更新套餐"""
    service = PackageService(DATABASE)
    try:
        result = service.update_package(
            package_id=package_id,
            package_data=package.dict(exclude_unset=True),
            operator=current_user.username
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "名称已存在" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg
            )
        elif "状态" in error_msg or "不存在" in error_msg or "无效" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )

@router.post("/{package_id}/copy", response_model=dict, status_code=status.HTTP_201_CREATED)
async def copy_package(
    package_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """复制套餐"""
    service = PackageService(DATABASE)
    try:
        result = service.copy_package(
            package_id=package_id,
            operator=current_user.username
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("", response_model=PackageListResponse)
async def list_packages(
    keyword: Optional[str] = None,
    package_type: Optional[str] = None,
    is_green_power: Optional[str] = None,
    model_code: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_active_user)
):
    """获取套餐列表"""
    service = PackageService(DATABASE)
    result = service.list_packages(
        filters={
            "keyword": keyword,
            "package_type": package_type,
            "is_green_power": is_green_power,
            "model_code": model_code,
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
    """激活套餐"""
    service = PackageService(DATABASE)
    try:
        result = service.change_status(
            package_id=package_id,
            new_status="active",
            operator=current_user.username
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "不允许的状态转换" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )

@router.post("/{package_id}/archive", response_model=dict)
async def archive_package(
    package_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """归档套餐"""
    service = PackageService(DATABASE)
    try:
        result = service.change_status(
            package_id=package_id,
            new_status="archived",
            operator=current_user.username
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "不允许的状态转换" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )

@router.get("/{package_id}", response_model=dict)
async def get_package(
    package_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """获取套餐详情"""
    service = PackageService(DATABASE)
    try:
        result = service.get_package_by_id(package_id)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.delete("/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_package(
    package_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """删除套餐（仅草稿状态）"""
    service = PackageService(DATABASE)
    try:
        service.delete_package(package_id)
        return None  # 204 No Content
    except ValueError as e:
        error_msg = str(e)
        if "状态" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )