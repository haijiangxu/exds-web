from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime
from bson import ObjectId
from .retail_package import PyObjectId, BaseMongoModel


class PricingModel(BaseMongoModel):
    """定价模型配置"""
    model_code: str = Field(..., description="模型唯一标识，格式：{pricing_mode}_{floating_type}_{package_type}")
    display_name: str = Field(..., description="模型显示名称")
    package_type: Literal["time_based", "non_time_based"] = Field(..., description="套餐类型：分时/不分时")
    pricing_mode: str = Field(..., description="定价模式：fixed_linked/reference_linked/price_spread_simple/price_spread_formula/single_comprehensive")
    floating_type: Optional[Literal["fee", "price"]] = Field(None, description="浮动类型：fee（费用）/price（价格），单一综合价模型为None")
    formula: str = Field(..., description="计算公式（HTML格式）")
    description: str = Field(..., description="套餐说明（HTML格式）")
    enabled: bool = Field(default=True, description="是否启用")
    sort_order: int = Field(..., description="排序顺序")

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PricingModelListItem(BaseModel):
    """定价模型列表项（简化版）"""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., alias="_id")
    model_code: str
    display_name: str
    package_type: Literal["time_based", "non_time_based"]
    pricing_mode: str
    floating_type: Optional[Literal["fee", "price"]]
    enabled: bool
    sort_order: int
