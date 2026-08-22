from __future__ import annotations

import hashlib
from urllib.parse import quote, quote_plus


def representative_image_url(query: str, seed: str = "1") -> str:
    """Representative photo feed for prototype cards; not a seller product photo."""
    cleaned = (query or "product").strip().lower()
    tags = quote(cleaned.replace(" ", ","), safe=",")
    lock = int(hashlib.sha1(f"{cleaned}:{seed}".encode("utf-8")).hexdigest()[:6], 16) % 10000
    return f"https://loremflickr.com/720/520/{tags}?lock={lock}"


def shopping_links(query: str) -> dict[str, str]:
    q = quote_plus((query or "product").strip())
    return {
        "Amazon": f"https://www.amazon.in/s?k={q}",
        "Flipkart": f"https://www.flipkart.com/search?q={q}",
        "Meesho": f"https://www.meesho.com/search?q={q}",
        "IndiaMART": f"https://dir.indiamart.com/search.mp?ss={q}",
        "Google Shopping": f"https://www.google.com/search?tbm=shop&q={q}",
    }


def nearby_shops_link(query: str) -> str:
    q = quote_plus(f"{(query or 'product').strip()} shop near me")
    return f"https://www.google.com/maps/search/?api=1&query={q}"


def local_market_range(price: int, synthetic: bool = False) -> str:
    """Approximate Indian local-market range around a prototype price anchor."""
    p = max(1, int(price or 1))
    low_factor = 0.65 if synthetic else 0.82
    high_factor = 1.35 if synthetic else 1.18
    low = max(10, int(round((p * low_factor) / 10.0) * 10))
    high = max(low, int(round((p * high_factor) / 10.0) * 10))
    return f"₹{low:,}–₹{high:,}"


def enrich_product(item: dict, query: str, index: int = 0) -> dict:
    result = dict(item)
    synthetic = bool(result.get("synthetic_demo"))
    result.setdefault("image_url", representative_image_url(query or result.get("name", "product"), str(index + 1)))
    result.setdefault("image_label", "Representative preview")
    result.setdefault("buy_links", shopping_links(query or result.get("name", "product")))
    result.setdefault("nearby_link", nearby_shops_link(query or result.get("name", "product")))
    result.setdefault("local_market_range", local_market_range(result.get("price", 0), synthetic=synthetic))
    result.setdefault(
        "price_note",
        "Estimated India local-market range; varies by city, brand, quality, size and seller."
        if synthetic
        else "Prototype catalogue price with an approximate local-market comparison range.",
    )
    result.setdefault("price_label", "Estimated local price" if synthetic else "Demo catalogue price")
    return result
