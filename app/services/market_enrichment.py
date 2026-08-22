from __future__ import annotations

from urllib.parse import quote_plus


def shopping_links(query: str) -> dict[str, str]:
    q = quote_plus((query or "product").strip())
    return {
        "Amazon": f"https://www.amazon.in/s?k={q}",
        "Flipkart": f"https://www.flipkart.com/search?q={q}",
        "Meesho": f"https://www.meesho.com/search?q={q}",
        "IndiaMART": f"https://dir.indiamart.com/search.mp?ss={q}",
        "Google Shopping": f"https://www.google.com/search?tbm=shop&q={q}",
    }


def image_search_link(query: str) -> str:
    q = quote_plus((query or "product").strip())
    return f"https://www.google.com/search?tbm=isch&q={q}"


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
    search_query = result.get("name") or query or "product"

    # IMPORTANT: generated/demo listings must not show random web photos as if
    # they were the exact branded item. Only display an inline photo when a
    # trusted catalogue record explicitly provides image_url.
    if not result.get("image_url"):
        result["image_url"] = None
    result["image_label"] = "Verified product image" if result.get("image_url") else "Exact image not verified"
    result["image_search_url"] = image_search_link(search_query)
    result["buy_links"] = shopping_links(search_query)
    result["nearby_link"] = nearby_shops_link(search_query)
    result["local_market_range"] = local_market_range(result.get("price", 0), synthetic=synthetic)
    result["price_note"] = (
        "Estimated India local-market range; varies by city, brand, quality, size and seller."
        if synthetic
        else "Prototype catalogue price with an approximate local-market comparison range."
    )
    result["price_label"] = "Estimated local price" if synthetic else "Demo catalogue price"
    return result
