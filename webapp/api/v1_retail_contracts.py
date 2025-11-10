from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from webapp.models.contract import Contract, ContractCreate, ContractListResponse
from webapp.services.contract_service import ContractService
from webapp.tools.mongo import DATABASE
from webapp.tools.security import get_current_active_user, User

router = APIRouter(prefix="/retail-contracts", tags=["Retail Contracts"])


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_contract(
    contract: ContractCreate,
    current_user: User = Depends(get_current_active_user)
):
    """创建新合同"""
    service = ContractService(DATABASE)
    try:
        result = service.create_contract(
            contract_data=contract.model_dump(exclude_unset=True),
            operator=current_user.username
        )
        return result
    except ValueError as e:
        error_msg = str(e)
        if "不存在" in error_msg or "无效" in error_msg or "状态不是" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )


@router.get("", response_model=ContractListResponse)
async def list_contracts(
    package_name: Optional[str] = Query(None, description="套餐名称（模糊搜索）"),
    customer_name: Optional[str] = Query(None, description="客户名称（模糊搜索）"),
    status: Optional[str] = Query(None, description="合同状态（pending/active/expired）"),
    purchase_start_month: Optional[str] = Query(None, description="购电开始月份筛选（yyyy-MM）"),
    purchase_end_month: Optional[str] = Query(None, description="购电结束月份筛选（yyyy-MM）"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页大小"),
    current_user: User = Depends(get_current_active_user)
):
    """
    获取合同列表

    支持筛选：
    - package_name: 套餐名称（模糊搜索）
    - customer_name: 客户名称（模糊搜索）
    - status: 合同状态（pending/active/expired）

    支持分页：
    - page: 页码（从1开始）
    - page_size: 每页数量
    """
    service = ContractService(DATABASE)
    result = service.list_contracts(
        filters={
            "package_name": package_name,
            "customer_name": customer_name,
            "status": status,
            "purchase_start_month": purchase_start_month,
            "purchase_end_month": purchase_end_month
        },
        page=page,
        page_size=page_size
    )
    return result


@router.get("/{contract_id}", response_model=dict)
async def get_contract(
    contract_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """获取合同详情"""
    service = ContractService(DATABASE)
    try:
        result = service.get_contract_by_id(contract_id)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{contract_id}", response_model=dict)
async def update_contract(
    contract_id: str,
    contract: ContractCreate,
    current_user: User = Depends(get_current_active_user)
):
    """更新合同（仅待生效状态）"""
    service = ContractService(DATABASE)
    try:
        result = service.update_contract(
            contract_id=contract_id,
            contract_data=contract.model_dump(exclude_unset=True),
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
        elif "状态" in error_msg or "无效" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )


@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contract(
    contract_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """删除合同（仅待生效状态）"""
    service = ContractService(DATABASE)
    try:
        service.delete_contract(contract_id)
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
