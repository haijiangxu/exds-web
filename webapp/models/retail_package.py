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


# Models based on design document (v4 重构后)
class ValidationResult(BaseModel):
    """价格比例校验结果"""
    price_ratio_compliant: bool = Field(default=True, description="是否符合463号文比例")
    actual_ratios: dict = Field(default_factory=dict, description="实际比例")
    expected_ratios: dict = Field(default_factory=dict, description="标准比例")
    warnings: List[str] = Field(default_factory=list, description="警告信息")


class RetailPackage(BaseMongoModel):
    # 基本信息
    package_name: str = Field(...)
    package_description: Optional[str] = None
    package_type: Literal["time_based", "non_time_based"]
    model_code: str = Field(..., description="定价模型代码，如 'fixed_linked_fee_non_time'")

    # 价格配置（根据模型动态使用，扁平化字典结构）
    pricing_config: dict = Field(default_factory=dict, description="统一的定价配置字典")

    # 绿电标识
    is_green_power: bool = False

    # 状态和元数据
    status: Literal["draft", "active", "archived"] = "draft"

    # 校验信息
    validation: Optional[ValidationResult] = None

    # 审计字段
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None
    activated_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None



class RetailPackageListItem(BaseMongoModel):
    package_name: str
    package_type: Literal["time_based", "non_time_based"]
    model_code: str  # 定价模型代码
    is_green_power: bool = False
    status: Literal["draft", "active", "archived"]
    created_at: datetime
    updated_at: datetime

class PackageListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[RetailPackageListItem]