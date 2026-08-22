from __future__ import annotations

import base64
import html
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


def nearby_shops_link(query: str) -> str:
    q = quote_plus(f"{(query or 'product').strip()} shop near me")
    return f"https://www.google.com/maps/search/?api=1&query={q}"


def local_market_range(price: int, synthetic: bool = False) -> str:
    p = max(1, int(price or 1))
    low_factor = 0.65 if synthetic else 0.82
    high_factor = 1.35 if synthetic else 1.18
    low = max(10, int(round((p * low_factor) / 10.0) * 10))
    high = max(low, int(round((p * high_factor) / 10.0) * 10))
    return f"₹{low:,}–₹{high:,}"


def _category_symbol(query: str) -> tuple[str, str]:
    text = (query or "product").lower()
    rules = [
        (("shoe", "slipper", "sandal", "sneaker"), "FOOTWEAR", "M164 300c46-22 105-65 160-65 53 0 92 14 134 42l78 52c23 15 47 25 75 30l88 17c23 4 39 24 39 47v23H139c-34 0-61-27-61-61 0-38 21-72 55-89l31-15Z"),
        (("phone", "mobile", "smartphone"), "MOBILE", "M220 75h200c28 0 50 22 50 50v390c0 28-22 50-50 50H220c-28 0-50-22-50-50V125c0-28 22-50 50-50Zm25 58v336h150V133H245Zm75 390a22 22 0 1 0 0-44 22 22 0 0 0 0 44Z"),
        (("laptop", "notebook computer"), "LAPTOP", "M155 140h330c24 0 43 19 43 43v220H112V183c0-24 19-43 43-43Zm-79 292h488l-33 48H109l-33-48Z"),
        (("towel", "cloth", "bedsheet", "shirt", "tshirt", "underwear", "innerwear"), "TEXTILE", "M180 118h280l46 74-62 55-34-43v302H230V204l-34 43-62-55 46-74Zm79 0 61 72 61-72H259Z"),
        (("chair",), "FURNITURE", "M197 142h246v178H197V142Zm-31 203h308v64H166v-64Zm31 64h52v120h-52V409Zm194 0h52v120h-52V409Z"),
        (("bottle",), "HOUSEHOLD", "M273 84h94v63l31 43v293c0 34-27 61-61 61h-34c-34 0-61-27-61-61V190l31-43V84Zm-3 181h100v180H270V265Z"),
        (("bucket", "container", "storage box"), "HOUSEHOLD", "M145 210h350l-38 292H183l-38-292Zm72-78h206l38 54H179l38-54Z"),
        (("tv", "television", "monitor"), "DISPLAY", "M112 130h416c29 0 52 23 52 52v270c0 29-23 52-52 52H112c-29 0-52-23-52-52V182c0-29 23-52 52-52Zm31 54v266h354V184H143Zm111 347h132v37H254v-37Z"),
        (("tool", "drill", "hammer", "screwdriver", "wrench"), "TOOLS", "M405 104c-20 0-39 5-56 14l62 62-56 56-62-62c-9 17-14 36-14 56 0 58 47 105 105 105 12 0 24-2 35-6l111 111c18 18 47 18 65 0s18-47 0-65L484 264c4-11 6-23 6-35 0-69-56-125-125-125Z"),
        (("xbox", "playstation", "console", "gaming"), "GAMING", "M176 222h288c44 0 82 31 91 74l35 163c9 43-41 72-73 43l-80-73H203l-80 73c-32 29-82 0-73-43l35-163c9-43 47-74 91-74Zm42 55v58h-58v44h58v58h44v-58h58v-44h-58v-58h-44Zm231 18a26 26 0 1 0 0 52 26 26 0 0 0 0-52Zm60 70a26 26 0 1 0 0 52 26 26 0 0 0 0-52Z"),
    ]
    for keywords, label, path in rules:
        if any(k in text for k in keywords):
            return label, path
    return "PRODUCT", "M153 157h334l42 87-46 282H157l-46-282 42-87Zm70-76h194l38 76H185l38-76Zm-1 176v193h196V257H222Z"


def illustrated_preview_data_uri(name: str, query: str) -> str:
    label, path = _category_symbol(query)
    safe_name = html.escape((name or query or "Product")[:46])
    safe_label = html.escape(label)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#101827"/>
          <stop offset="1" stop-color="#182f2a"/>
        </linearGradient>
        <linearGradient id="a" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#20c997"/>
          <stop offset="1" stop-color="#56d6ff"/>
        </linearGradient>
      </defs>
      <rect width="960" height="640" rx="34" fill="url(#g)"/>
      <circle cx="480" cy="260" r="188" fill="#ffffff" opacity=".035"/>
      <circle cx="480" cy="260" r="150" fill="#ffffff" opacity=".025"/>
      <g transform="translate(250 20) scale(.72)" fill="url(#a)"><path d="{path}"/></g>
      <text x="480" y="490" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#f5f7f8">{safe_name}</text>
      <text x="480" y="540" text-anchor="middle" font-family="Arial, sans-serif" font-size="23" font-weight="700" letter-spacing="4" fill="#72dfc1">{safe_label}</text>
      <text x="480" y="584" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#9ea9ad">ILLUSTRATED PREVIEW · NOT SELLER PHOTO</text>
    </svg>'''
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def enrich_product(item: dict, query: str, index: int = 0) -> dict:
    result = dict(item)
    synthetic = bool(result.get("synthetic_demo"))
    search_query = result.get("name") or query or "product"

    if result.get("image_url"):
        result["image_label"] = "Product image"
    else:
        result["image_url"] = illustrated_preview_data_uri(result.get("name") or query, query)
        result["image_label"] = "Illustrated preview"

    # No image-search redirect. Nexora always renders a visual directly in-card.
    result["image_search_url"] = None
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
