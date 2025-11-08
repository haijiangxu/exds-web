from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import Optional, List
from webapp.models.customer import (
    Customer, CustomerCreate, CustomerUpdate, CustomerListResponse,
    MeterInfo, SyncUpdateRequest
)
from webapp.services.customer_service import CustomerService
from webapp.tools.mongo import DATABASE
from webapp.tools.security import get_current_active_user, User

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer: CustomerCreate,
    current_user: User = Depends(get_current_active_user)
):
    """创建新客户"""
    service = CustomerService(DATABASE)
    try:
        result = service.create_customer(
            customer_data=customer.model_dump(exclude_unset=True),
            operator=current_user.username
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "已存在" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )


@router.get("", response_model=CustomerListResponse)
async def list_customers(
    keyword: Optional[str] = Query(None, description="搜索关键词（客户全称或简称）"),
    user_type: Optional[str] = Query(None, description="客户类型"),
    industry: Optional[str] = Query(None, description="行业"),
    voltage: Optional[str] = Query(None, description="电压等级"),
    region: Optional[str] = Query(None, description="地区"),
    status: Optional[str] = Query(None, description="状态"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页大小"),
    current_user: User = Depends(get_current_active_user)
):
    """获取客户列表"""
    service = CustomerService(DATABASE)
    result = service.list_customers(
        filters={
            "keyword": keyword,
            "user_type": user_type,
            "industry": industry,
            "voltage": voltage,
            "region": region,
            "status": status
        },
        page=page,
        page_size=page_size
    )
    return result


@router.get("/{customer_id}", response_model=dict)
async def get_customer(
    customer_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """获取客户详情"""
    service = CustomerService(DATABASE)
    try:
        result = service.get_customer_by_id(customer_id)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{customer_id}", response_model=dict)
async def update_customer(
    customer_id: str,
    customer: CustomerUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """更新客户信息"""
    service = CustomerService(DATABASE)
    try:
        result = service.update_customer(
            customer_id=customer_id,
            customer_data=customer.model_dump(exclude_unset=True),
            operator=current_user.username
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "不存在" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        elif "已存在" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """删除客户（软删除）"""
    service = CustomerService(DATABASE)
    try:
        service.delete_customer(customer_id)
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# 户号管理接口
@router.post("/{customer_id}/accounts", response_model=dict)
async def add_utility_account(
    customer_id: str,
    account_data: dict = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    """为客户添加户号"""
    service = CustomerService(DATABASE)
    try:
        result = service.add_utility_account(
            customer_id=customer_id,
            account_data=account_data,
            operator=current_user.username
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "不存在" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        elif "已存在" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )


@router.put("/{customer_id}/accounts/{account_id}", response_model=dict)
async def update_utility_account(
    customer_id: str,
    account_id: str,
    account_data: dict = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    """更新户号信息"""
    service = CustomerService(DATABASE)
    try:
        result = service.update_utility_account(
            customer_id=customer_id,
            account_id=account_id,
            account_data=account_data,
            operator=current_user.username
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "不存在" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )


@router.delete("/{customer_id}/accounts/{account_id}", response_model=dict)
async def delete_utility_account(
    customer_id: str,
    account_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """删除户号"""
    service = CustomerService(DATABASE)
    try:
        result = service.delete_utility_account(
            customer_id=customer_id,
            account_id=account_id,
            operator=current_user.username
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# 计量点管理接口
@router.post("/{customer_id}/accounts/{account_id}/metering-points", response_model=dict)
async def add_metering_point(
    customer_id: str,
    account_id: str,
    metering_point_data: dict = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    """为户号添加计量点"""
    service = CustomerService(DATABASE)
    try:
        result = service.add_metering_point(
            customer_id=customer_id,
            account_id=account_id,
            metering_point_data=metering_point_data,
            operator=current_user.username
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "不存在" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        elif "已存在" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )


@router.put("/{customer_id}/accounts/{account_id}/metering-points/{metering_point_id}", response_model=dict)
async def update_metering_point(
    customer_id: str,
    account_id: str,
    metering_point_id: str,
    metering_point_data: dict = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    """更新计量点信息"""
    service = CustomerService(DATABASE)
    try:
        result = service.update_metering_point(
            customer_id=customer_id,
            account_id=account_id,
            metering_point_id=metering_point_id,
            metering_point_data=metering_point_data,
            operator=current_user.username
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "不存在" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )


@router.delete("/{customer_id}/accounts/{account_id}/metering-points/{metering_point_id}", response_model=dict)
async def delete_metering_point(
    customer_id: str,
    account_id: str,
    metering_point_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """删除计量点"""
    service = CustomerService(DATABASE)
    try:
        result = service.delete_metering_point(
            customer_id=customer_id,
            account_id=account_id,
            metering_point_id=metering_point_id,
            operator=current_user.username
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# 数据一致性管理接口
@router.get("/meter-info/{meter_id}", response_model=MeterInfo)
async def get_meter_info(
    meter_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """获取电表信息（用于自动填充）"""
    service = CustomerService(DATABASE)
    result = service.get_meter_info(meter_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"电表 '{meter_id}' 不存在"
        )
    return result


@router.post("/meters/{meter_id}/sync-update", response_model=dict)
async def sync_update_meter(
    meter_id: str,
    update_data: SyncUpdateRequest,
    current_user: User = Depends(get_current_active_user)
):
    """同步更新电表信息"""
    service = CustomerService(DATABASE)

    # 检查电表是否存在
    meter_info = service.get_meter_info(meter_id)
    if not meter_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"电表 '{meter_id}' 不存在"
        )

    # 执行同步更新
    result = service.sync_update_meter(
        meter_id=meter_id,
        update_data=update_data.model_dump(exclude_unset=True, exclude={"sync_all"}),
        sync_all=update_data.sync_all,
        operator=current_user.username
    )

    return result