from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import datetime

class CustomPrices(BaseModel):
    peak: float = Field(..., ge=0, description="尖峰时段价格")
    high: float = Field(..., ge=0, description="峰时段价格")
    flat: float = Field(..., ge=331.44, le=497.16, description="平时段价格")
    valley: float = Field(..., ge=0, description="谷时段价格")
    deep_valley: float = Field(..., ge=0, description="深谷时段价格")

class FixedPriceConfig(BaseModel):
    pricing_method: Literal["custom", "reference"]
    custom_prices: Optional[CustomPrices] = None
    reference_target: Optional[str] = None
    reference_prices: Optional[dict] = None

class LinkedPriceConfig(BaseModel):
    ratio: float = Field(..., ge=0, le=0.2, description="联动比例")
    target: Literal["day_ahead_avg", "real_time_avg"]

class FixedLinkedConfig(BaseModel):
    fixed_price: FixedPriceConfig
    linked_price: LinkedPriceConfig
    floating_fee: float = Field(default=0, ge=0)

class RetailPackage(BaseModel):
    package_name: str = Field(..., min_length=1, max_length=100)
    package_description: Optional[str] = None
    package_type: Literal["time_based", "non_time_based"]
    pricing_mode: Literal["fixed_linked", "price_spread"]
    fixed_linked_config: Optional[FixedLinkedConfig] = None
    # ... 其他字段

    @validator('fixed_linked_config')
    def validate_pricing_config(cls, v, values):
        if values.get('pricing_mode') == 'fixed_linked' and not v:
            raise ValueError("固定+联动模式必须提供配置")
        return v