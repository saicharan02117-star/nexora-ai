from typing import Any, Literal
from pydantic import BaseModel, Field


class MissionRequest(BaseModel):
    message: str = Field(min_length=2, max_length=2000)
    user_id: str = "demo-user"


class AgentStep(BaseModel):
    agent: str
    status: Literal["completed", "needs_confirmation", "blocked"] = "completed"
    summary: str


class Recommendation(BaseModel):
    id: str
    name: str
    merchant: str
    price: int
    score: float
    reasons: list[str]
    metadata: dict[str, Any] = {}


class MissionResponse(BaseModel):
    mission_id: str
    mission_type: str
    intent: dict[str, Any]
    plan: list[str]
    steps: list[AgentStep]
    recommendations: list[Recommendation] = []
    budget_summary: dict[str, Any] = {}
    requires_payment_confirmation: bool = True
    next_action: str


class PaymentOrderRequest(BaseModel):
    mission_id: str
    amount: int = Field(gt=0)
    currency: str = "INR"
    description: str = "Nexora mission checkout"


class PaymentVerificationRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PermissionUpdate(BaseModel):
    search_products: bool = True
    compare_products: bool = True
    negotiate_offer: bool = True
    add_to_cart: bool = True
    execute_payment: bool = False
    payment_requires_confirmation: bool = True
    maximum_transaction: int = 70000
