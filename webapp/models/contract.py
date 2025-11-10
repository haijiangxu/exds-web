from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, Literal, List, Any
from datetime import datetime
from bson import ObjectId


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type: Any, handler):
        from pydantic_core import core_schema
        return core_schema.union_schema([
            core_schema.is_instance_schema(ObjectId),
            core_schema.no_info_plain_validator_function(cls.validate),
        ], serialization=core_schema.plain_serializer_function_ser_schema(
            lambda x: str(x)
        ))

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str):
            if not ObjectId.is_valid(v):
                raise ValueError("Invalid ObjectId")
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")


class BaseMongoModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")


# 套餐快照模型
class PackageSnapshot(BaseModel):
    """套餐内容快照（创建合同时保存）"""
    package_type: Optional[str] = Field(None, description="套餐类型")
    model_code: Optional[str] = Field(None, description="定价模型代码")
    is_green_power: Optional[bool] = Field(None, description="是否绿电")
    pricing_config: Optional[dict] = Field(None, description="定价配置详情")


# 合同创建模型
class ContractCreate(BaseModel):
    """合同创建输入模型"""
    contract_name: str = Field(..., min_length=1, description="合同名称")
    package_name: str = Field(..., min_length=1, description="套餐名称")
    package_id: str = Field(..., min_length=1, description="套餐ID")
    customer_name: str = Field(..., min_length=1, description="客户名称")
    customer_id: str = Field(..., min_length=1, description="客户ID")
    purchasing_electricity_quantity: float = Field(..., gt=0, description="购买电量(kWh)")
    purchase_start_month: datetime = Field(..., description="购电开始月份")
    purchase_end_month: datetime = Field(..., description="购电结束月份")
    package_snapshot: Optional[PackageSnapshot] = Field(None, description="套餐内容快照")

    @field_validator('purchase_end_month')
    @classmethod
    def validate_end_month(cls, v, info):
        """验证购电结束月份必须大于等于开始月份"""
        if 'purchase_start_month' in info.data:
            start_month = info.data['purchase_start_month']
            if v < start_month:
                raise ValueError("购电结束月份必须大于等于购电开始月份")
        return v


# 合同完整模型
class Contract(BaseMongoModel, ContractCreate):
    """合同完整数据模型"""
    # 审计字段
    created_by: Optional[str] = Field(None, description="创建人")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    updated_by: Optional[str] = Field(None, description="更新人")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新时间")


# 合同列表项模型
class ContractListItem(BaseModel):
    """合同列表项模型（用于列表展示）"""
    id: str = Field(..., description="合同ID")
    contract_name: str = Field(..., description="合同名称")
    package_name: str = Field(..., description="套餐名称")
    customer_name: str = Field(..., description="客户名称")
    purchasing_electricity_quantity: float = Field(..., description="购买电量(kWh)")
    purchase_start_month: datetime = Field(..., description="购电开始月份")
    purchase_end_month: datetime = Field(..., description="购电结束月份")
    status: Literal["pending", "active", "expired"] = Field(..., description="合同状态")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")


# 合同列表响应模型
class ContractListResponse(BaseModel):
    """合同列表响应模型"""
    total: int = Field(..., description="总数量")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页大小")
    items: List[ContractListItem] = Field(..., description="合同列表")


# 状态计算函数
def calculate_contract_status(purchase_start_month: datetime, purchase_end_month: datetime) -> str:
    """
    计算合同状态（虚拟字段）

    规则：
    - 待生效 (pending): 当前月份 < 购电开始月份
    - 生效 (active): 当前月份 >= 购电开始月份 且 <= 购电结束月份
    - 已过期 (expired): 当前月份 > 购电结束月份

    Args:
        purchase_start_month: 购电开始月份
        purchase_end_month: 购电结束月份

    Returns:
        str: 合同状态 ('pending' | 'active' | 'expired')
    """
    now = datetime.utcnow()
    # 将所有日期统一为每月1号进行比较
    current_month = datetime(now.year, now.month, 1)
    start_month = datetime(purchase_start_month.year, purchase_start_month.month, 1)
    end_month = datetime(purchase_end_month.year, purchase_end_month.month, 1)

    if current_month < start_month:
        return "pending"
    elif current_month > end_month:
        return "expired"
    else:
        return "active"
