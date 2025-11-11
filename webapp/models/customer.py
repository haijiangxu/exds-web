from pydantic import BaseModel, Field, ConfigDict
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


class Location(BaseModel):
    """地理位置信息"""
    type: Literal["Point"] = "Point"
    coordinates: List[float] = Field(..., description="经纬度坐标 [longitude, latitude]")


class Meter(BaseModel):
    """电表信息"""
    meter_id: str = Field(..., description="电表资产号")
    multiplier: float = Field(..., gt=0, description="倍率")


class MeteringPoint(BaseModel):
    """计量点信息"""
    metering_point_id: str = Field(..., description="计量点ID")
    allocation_percentage: float = Field(..., ge=0, le=100, description="分摊比例(%)")
    meter: Meter = Field(..., description="电表信息")


class UtilityAccount(BaseModel):
    """户号信息"""
    account_id: str = Field(..., description="户号")
    metering_points: List[MeteringPoint] = Field(default_factory=list, description="计量点列表")


class CustomerCreate(BaseModel):
    """客户创建模型"""
    # 客户基本信息
    user_name: str = Field(..., min_length=1, description="客户全称")
    short_name: str = Field(..., min_length=1, description="客户简称")
    user_type: Optional[str] = Field(None, description="客户类型")
    industry: Optional[str] = Field(None, description="行业")
    voltage: Optional[str] = Field(None, description="电压等级")
    region: Optional[str] = Field(None, description="地区")
    district: Optional[str] = Field(None, description="区县")
    address: Optional[str] = Field(None, description="详细地址")
    location: Optional[Location] = Field(None, description="地理位置")

    # 联系信息
    contact_person: Optional[str] = Field(None, description="联系人")
    contact_phone: Optional[str] = Field(None, description="联系电话")

    # 户号信息
    utility_accounts: List[UtilityAccount] = Field(default_factory=list, description="户号列表")


class Customer(BaseMongoModel, CustomerCreate):
    """客户完整模型"""
    # 状态管理（5个核心状态）
    # prospect: 意向客户 - 默认初始状态，未签约
    # pending: 待生效 - 已签约但未开始服务
    # active: 执行中 - 核心活跃状态，正在提供服务
    # suspended: 已暂停 - 临时冻结状态
    # terminated: 已终止 - 合同结束，不可再编辑
    status: Literal["prospect", "pending", "active", "suspended", "terminated"] = "prospect"

    # 审计字段
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新时间")
    created_by: Optional[str] = Field(None, description="创建人")
    updated_by: Optional[str] = Field(None, description="更新人")


class CustomerUpdate(BaseModel):
    """客户更新模型（所有字段可选）"""
    # 客户基本信息
    user_name: Optional[str] = Field(None, min_length=1, description="客户全称")
    short_name: Optional[str] = Field(None, min_length=1, description="客户简称")
    user_type: Optional[str] = Field(None, description="客户类型")
    industry: Optional[str] = Field(None, description="行业")
    voltage: Optional[str] = Field(None, description="电压等级")
    region: Optional[str] = Field(None, description="地区")
    district: Optional[str] = Field(None, description="区县")
    address: Optional[str] = Field(None, description="详细地址")
    location: Optional[Location] = Field(None, description="地理位置")

    # 联系信息
    contact_person: Optional[str] = Field(None, description="联系人")
    contact_phone: Optional[str] = Field(None, description="联系电话")

    # 状态管理
    status: Optional[Literal["prospect", "pending", "active", "suspended", "terminated"]] = Field(None, description="状态")

    # 户号信息
    utility_accounts: Optional[List[UtilityAccount]] = Field(None, description="户号列表")


class CustomerListItem(BaseModel):
    """客户列表项模型"""
    id: str = Field(..., description="客户ID")
    user_name: str = Field(..., description="客户全称")
    user_type: Optional[str] = Field(None, description="客户类型")
    industry: Optional[str] = Field(None, description="行业")
    region: Optional[str] = Field(None, description="地区")
    status: Literal["prospect", "pending", "active", "suspended", "terminated"] = Field(..., description="状态")
    metering_point_count: int = Field(..., description="计量点数量")
    contracted_capacity: Optional[float] = Field(None, description="签约电量(kWh)")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")


class CustomerListResponse(BaseModel):
    """客户列表响应模型"""
    total: int = Field(..., description="总数量")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页大小")
    items: List[CustomerListItem] = Field(..., description="客户列表")


class MeterInfo(BaseModel):
    """电表信息（用于自动填充）"""
    meter_id: str = Field(..., description="电表资产号")
    multiplier: float = Field(..., description="倍率")
    usage_count: int = Field(..., description="使用次数")


class SyncUpdateRequest(BaseModel):
    """同步更新请求模型"""
    multiplier: Optional[float] = Field(None, gt=0, description="新倍率")
    sync_all: bool = Field(True, description="是否同步更新所有计量点")