from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, _core_schema, _handler):
        return {"type": "string"}

class BaseMongoModel(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True
        arbitrary_types_allowed = True


# Models based on design document
class CustomPrices(BaseModel):
    peak: float = Field(..., ge=0, description="尖峰时段价格")
    high: float = Field(..., ge=0, description="峰时段价格")
    flat: float = Field(..., ge=331.44, le=497.16, description="平时段价格")
    valley: float = Field(..., ge=0, description="谷时段价格")
    deep_valley: float = Field(..., ge=0, description="深谷时段价格")

class FixedPriceConfig(BaseModel):
    pricing_method: Literal["custom", "reference"]
    custom_prices: Optional[CustomPrices] = None
    reference_target: Optional[Literal["grid_agency_price", "market_monthly_avg"]] = None
    reference_prices: Optional[dict] = None # To store snapshot of referenced prices

class LinkedPriceConfig(BaseModel):
    ratio: float = Field(..., ge=0, le=0.2, description="联动比例 α (0.1 ~ 0.2)")
    target: Literal["day_ahead_avg", "real_time_avg"]

class FixedLinkedConfig(BaseModel):
    fixed_price: FixedPriceConfig
    linked_price: LinkedPriceConfig
    floating_fee: float = Field(default=0, ge=0, description="浮动费用 (元/kWh)")

class PriceSpreadReferencePrice(BaseModel):
    target: Literal["market_monthly_avg", "grid_agency", "wholesale_settlement"]
    value: Optional[float] = None

class PriceSpreadSharing(BaseModel):
    agreed_spread: float = Field(..., description="约定价差（元/MWh）")
    sharing_ratio: float = Field(..., ge=0, le=1, description="分成比例 k (0 ~ 1)")

class PriceSpreadConfig(BaseModel):
    reference_price: PriceSpreadReferencePrice
    price_spread: PriceSpreadSharing
    floating_fee: float = Field(default=0, ge=0, description="浮动费用（元）")

class GreenPowerTerm(BaseModel):
    enabled: bool = False
    monthly_env_value: Optional[float] = Field(None, ge=0, description="月度绿色电力环境价值（元/MWh）")
    deviation_compensation_ratio: Optional[float] = Field(None, ge=0, description="偏差补偿比例（%）")

class PriceCapTerm(BaseModel):
    enabled: bool = False
    reference_target: Optional[str] = None
    non_peak_markup: Optional[float] = Field(None, ge=0, description="非尖峰月份上浮（%）")
    peak_markup: Optional[float] = Field(None, ge=0, description="尖峰月份上浮（%）")

class AdditionalTerms(BaseModel):
    green_power: GreenPowerTerm = Field(default_factory=GreenPowerTerm)
    price_cap: PriceCapTerm = Field(default_factory=PriceCapTerm)

class ValidationInfo(BaseModel):
    price_ratio_compliant: bool = True
    warnings: List[str] = []

class RetailPackage(BaseMongoModel):
    package_name: str = Field(..., min_length=1, max_length=100)
    package_description: Optional[str] = None
    package_type: Literal["time_based", "non_time_based"]
    pricing_mode: Literal["fixed_linked", "price_spread"]
    
    fixed_linked_config: Optional[FixedLinkedConfig] = None
    price_spread_config: Optional[PriceSpreadConfig] = None
    
    additional_terms: AdditionalTerms = Field(default_factory=AdditionalTerms)
    
    status: Literal["draft", "active", "archived"] = "draft"
    
    validation: ValidationInfo = Field(default_factory=ValidationInfo)

    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None
    activated_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None

    @model_validator(mode='after')
    def validate_pricing_config(self):
        if self.pricing_mode == 'fixed_linked' and not self.fixed_linked_config:
            raise ValueError("固定+联动模式必须提供 'fixed_linked_config'")
        if self.pricing_mode == 'price_spread' and not self.price_spread_config:
            raise ValueError("价差分成模式必须提供 'price_spread_config'")
        return self

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