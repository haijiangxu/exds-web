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


# Models based on design document
class CustomPrices(BaseModel):
    peak: float = Field(..., description="尖峰时段价格")
    high: float = Field(..., description="峰时段价格")
    flat: float = Field(..., description="平时段价格")
    valley: float = Field(..., description="谷时段价格")
    deep_valley: float = Field(..., description="深谷时段价格")

class FixedPriceConfig(BaseModel):
    pricing_method: Literal["custom", "reference"]
    custom_prices: Optional[CustomPrices] = None
    reference_target: Optional[Literal["grid_agency_price", "market_monthly_avg"]] = None
    reference_prices: Optional[dict] = None # To store snapshot of referenced prices

class LinkedPriceConfig(BaseModel):
    ratio: float = Field(..., description="联动比例 α (0.1 ~ 0.2)")
    target: Literal["day_ahead_avg", "real_time_avg"]

class FixedLinkedConfig(BaseModel):
    fixed_price: FixedPriceConfig
    linked_price: LinkedPriceConfig
    floating_fee: float = Field(default=0, description="浮动费用 (元/kWh)")

class PriceSpreadReferencePrice(BaseModel):
    target: Literal["market_monthly_avg", "grid_agency", "wholesale_settlement"]
    value: Optional[float] = None

class PriceSpreadSharing(BaseModel):
    agreed_spread: float = Field(..., description="约定价差（元/MWh）")
    sharing_ratio: float = Field(..., description="分成比例 k (0 ~ 1)")

class PriceSpreadConfig(BaseModel):
    reference_price: PriceSpreadReferencePrice
    price_spread: PriceSpreadSharing
    floating_fee: float = Field(default=0, description="浮动费用（元）")

class GreenPowerTerm(BaseModel):
    enabled: bool = False
    monthly_env_value: Optional[float] = Field(None, description="月度绿色电力环境价值（元/MWh）")
    deviation_compensation_ratio: Optional[float] = Field(None, description="偏差补偿比例（%）")

class PriceCapTerm(BaseModel):
    enabled: bool = False
    reference_target: Optional[str] = None
    non_peak_markup: Optional[float] = Field(None, description="非尖峰月份上浮（%）")
    peak_markup: Optional[float] = Field(None, description="尖峰月份上浮（%）")

class AdditionalTerms(BaseModel):
    green_power: GreenPowerTerm = Field(default_factory=GreenPowerTerm)
    price_cap: PriceCapTerm = Field(default_factory=PriceCapTerm)


class ValidationResult(BaseModel):
    """价格比例校验结果"""
    price_ratio_compliant: bool = Field(default=True, description="是否符合463号文比例")
    actual_ratios: dict = Field(default_factory=dict, description="实际比例")
    expected_ratios: dict = Field(default_factory=dict, description="标准比例")
    warnings: List[str] = Field(default_factory=list, description="警告信息")


class RetailPackage(BaseMongoModel):
    package_name: str = Field(...)
    package_description: Optional[str] = None
    package_type: Literal["time_based", "non_time_based"]
    pricing_mode: Literal["fixed_linked", "price_spread"]
    
    fixed_linked_config: Optional[FixedLinkedConfig] = None
    price_spread_config: Optional[PriceSpreadConfig] = None
    
    additional_terms: AdditionalTerms = Field(default_factory=AdditionalTerms)

    status: Literal["draft", "active", "archived"] = "draft"

    # 校验信息
    validation: Optional[ValidationResult] = None

    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None
    activated_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None



class RetailPackageListItem(BaseMongoModel):
    package_name: str
    package_type: Literal["time_based", "non_time_based"]
    pricing_mode: Literal["fixed_linked", "price_spread"]
    has_green_power: bool = False
    has_price_cap: bool = False
    status: Literal["draft", "active", "archived"]
    created_at: datetime
    updated_at: datetime

class PackageListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[RetailPackageListItem]