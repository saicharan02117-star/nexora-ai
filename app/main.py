from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import get_settings
from app.schemas import MissionRequest, MissionResponse, AgentStep, PaymentOrderRequest, PaymentVerificationRequest, PermissionUpdate
from app.agents.orchestrator import MasterOrchestrator
from app.agents.intent_agent import IntentAgent
from app.agents.merchant_intelligence_agent import MerchantIntelligenceAgent
from app.security.action_wallet import DEFAULT_WALLET
from app.services.razorpay_service import RazorpayService
from app.services.assistant_service import AssistantService


BASE_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIR = BASE_DIR / "frontend"
settings = get_settings()
app = FastAPI(title="Nexora AI API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

orchestrator = MasterOrchestrator()
intent_agent = IntentAgent()
assistant_service = AssistantService()
razorpay = RazorpayService()
merchant_intelligence = MerchantIntelligenceAgent()


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "app": settings.app_name,
        "demo_mode": not razorpay.configured,
        "general_intelligence": assistant_service.configured,
        "capabilities": [
            "general_chat", "conversation_memory", "commerce", "product_comparison",
            "merchant_intelligence", "voice_input", "image_preview", "razorpay_checkout"
        ],
    }


@app.post("/api/missions", response_model=MissionResponse)
async def create_mission(payload: MissionRequest) -> MissionResponse:
    detected = intent_agent.run(payload.message)

    # Commerce and merchant tasks use Nexora's specialist agent system.
    if detected["mission_type"] != "general_commerce":
        return orchestrator.run(payload.message, payload.user_id, payload.previous_intent)

    # Everything else enters the general assistant layer instead of returning
    # a dead-end commerce fallback.
    result = await assistant_service.respond(payload.user_id, payload.message)
    return MissionResponse(
        mission_id=f"NX-{uuid4().hex[:8].upper()}",
        mission_type="general_assistant",
        intent={
            "mission_type": "general_assistant",
            "category": "general",
            "raw_goal": payload.message,
            "assistant_mode": result["mode"],
        },
        plan=["Understand request", "Use conversation context", "Generate answer"],
        steps=[
            AgentStep(agent="Conversation Router", summary="Recognized this as a general assistant request."),
            AgentStep(
                agent="General Intelligence",
                summary=(
                    "Generated the answer using the configured intelligence gateway."
                    if result["mode"] == "model"
                    else "Used Nexora's offline fallback because no general-intelligence endpoint is configured."
                ),
            ),
        ],
        recommendations=[],
        budget_summary={},
        requires_payment_confirmation=False,
        next_action=result["answer"],
    )


@app.post("/api/conversations/{session_id}/reset")
def reset_conversation(session_id: str) -> dict:
    assistant_service.clear(session_id)
    return {"status": "cleared", "session_id": session_id}


@app.get("/api/merchant/metrics")
def merchant_metrics() -> dict:
    return merchant_intelligence.run()


@app.get("/api/permissions")
def permissions() -> dict:
    return DEFAULT_WALLET.to_dict()


@app.post("/api/permissions")
def update_permissions(payload: PermissionUpdate) -> dict:
    for key, value in payload.model_dump().items():
        setattr(DEFAULT_WALLET, key, value)
    return DEFAULT_WALLET.to_dict()


@app.post("/api/payments/order")
async def create_payment_order(payload: PaymentOrderRequest) -> dict:
    if payload.amount > DEFAULT_WALLET.maximum_transaction:
        raise HTTPException(status_code=403, detail="Amount exceeds the configured Action Wallet limit.")
    return await razorpay.create_order(
        amount=payload.amount,
        currency=payload.currency,
        receipt=payload.mission_id,
        notes={"mission_id": payload.mission_id, "description": payload.description},
    )


@app.post("/api/payments/verify")
def verify_payment(payload: PaymentVerificationRequest) -> dict:
    verified = razorpay.verify_signature(payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature)
    if not verified:
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")
    return {"verified": True, "status": "payment_verified"}


app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def home() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")
