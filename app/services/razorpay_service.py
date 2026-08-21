import base64
import hashlib
import hmac
import httpx
from app.config import get_settings


class RazorpayService:
    API_BASE = "https://api.razorpay.com/v1"

    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def configured(self) -> bool:
        return bool(self.settings.razorpay_key_id and self.settings.razorpay_key_secret)

    async def create_order(self, amount: int, currency: str, receipt: str, notes: dict) -> dict:
        if not self.configured:
            return {
                "mode": "demo",
                "id": f"order_demo_{receipt.lower()}",
                "amount": amount * 100,
                "currency": currency,
                "receipt": receipt,
                "status": "created",
                "key_id": "demo_key",
            }

        token = base64.b64encode(f"{self.settings.razorpay_key_id}:{self.settings.razorpay_key_secret}".encode()).decode()
        headers = {"Authorization": f"Basic {token}", "Content-Type": "application/json"}
        payload = {"amount": amount * 100, "currency": currency, "receipt": receipt, "notes": notes}
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(f"{self.API_BASE}/orders", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            data["mode"] = "sandbox"
            data["key_id"] = self.settings.razorpay_key_id
            return data

    def verify_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        if not self.configured:
            return signature == "demo_verified"
        message = f"{order_id}|{payment_id}".encode()
        expected = hmac.new(self.settings.razorpay_key_secret.encode(), message, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)
