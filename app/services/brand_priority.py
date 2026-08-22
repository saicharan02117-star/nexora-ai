from __future__ import annotations

import re

# Curated prototype brand map. The engine uses it only to order brand discovery
# and retailer searches; it does not invent a seller listing for these brands.
CATEGORY_BRANDS: dict[str, dict[str, list[str]]] = {
    "innerwear": {
        "indian": ["Rupa", "Lux", "Dollar", "Dixcy Scott"],
        "international": ["Jockey", "Calvin Klein", "Tommy Hilfiger"],
    },
    "towel_bedding": {
        "indian": ["Bombay Dyeing", "Welspun", "Trident", "Spaces"],
        "international": ["IKEA", "Marks & Spencer", "Amazon Basics"],
    },
    "footwear": {
        "indian": ["Campus", "Liberty", "Relaxo", "Sparx", "Red Tape"],
        "international": ["Nike", "Adidas", "Puma", "Skechers", "New Balance"],
    },
    "mobile": {
        "indian": ["Lava", "Micromax"],
        "international": ["Samsung", "Apple", "Motorola", "OnePlus", "Xiaomi", "realme", "vivo", "OPPO"],
    },
    "laptop": {
        "indian": ["Primebook", "JioBook"],
        "international": ["HP", "Dell", "Lenovo", "ASUS", "Acer", "Apple", "MSI"],
    },
    "audio_wearables": {
        "indian": ["boAt", "Noise", "Mivi", "Boult", "Zebronics", "Portronics"],
        "international": ["Sony", "JBL", "Samsung", "Apple", "Bose", "Sennheiser"],
    },
    "tv_electronics": {
        "indian": ["Onida", "BPL", "Croma"],
        "international": ["Samsung", "LG", "Sony", "TCL", "Hisense", "Xiaomi"],
    },
    "home_appliance": {
        "indian": ["Bajaj", "Havells", "Crompton", "Usha", "V-Guard", "Voltas", "Blue Star", "Godrej"],
        "international": ["LG", "Samsung", "Philips", "Bosch", "Panasonic", "Haier", "Whirlpool"],
    },
    "kitchen": {
        "indian": ["Prestige", "Hawkins", "Butterfly", "Pigeon", "Vinod", "Wonderchef"],
        "international": ["Philips", "Bosch", "Tefal", "IKEA"],
    },
    "furniture": {
        "indian": ["Nilkamal", "Godrej Interio", "Wakefit", "Durian"],
        "international": ["IKEA", "Home Centre"],
    },
    "plastic_household": {
        "indian": ["Cello", "Milton", "Nilkamal", "Supreme"],
        "international": ["IKEA", "Tupperware", "Amazon Basics"],
    },
    "tools": {
        "indian": ["Taparia", "Eastman", "JK"],
        "international": ["Bosch", "Stanley", "DeWalt", "Makita", "Black+Decker"],
    },
    "steel_materials": {
        "indian": ["Tata Steel", "JSW Steel", "Jindal"],
        "international": ["ArcelorMittal", "Nippon Steel"],
    },
    "clothing": {
        "indian": ["Raymond", "Fabindia", "Manyavar", "Biba", "W for Woman"],
        "international": ["H&M", "Zara", "Levi's", "Uniqlo", "Tommy Hilfiger"],
    },
    "bags": {
        "indian": ["Safari", "VIP", "Skybags", "Wildcraft"],
        "international": ["American Tourister", "Samsonite", "Decathlon"],
    },
    "stationery": {
        "indian": ["Classmate", "Apsara", "Nataraj", "DOMS"],
        "international": ["Faber-Castell", "Staedtler", "Pilot", "Uni-ball"],
    },
    "sports": {
        "indian": ["SG", "SS", "Nivia", "Cosco"],
        "international": ["Nike", "Adidas", "Puma", "Yonex", "Wilson"],
    },
    "toys": {
        "indian": ["Funskool", "Make It Real India"],
        "international": ["LEGO", "Mattel", "Hasbro"],
    },
    "bicycle": {
        "indian": ["Hero Cycles", "Avon Cycles", "Ninety One"],
        "international": ["Trek", "Giant", "Scott"],
    },
}

INDIAN_BRANDS = {b.lower(): b for group in CATEGORY_BRANDS.values() for b in group["indian"]}
INTERNATIONAL_BRANDS = {b.lower(): b for group in CATEGORY_BRANDS.values() for b in group["international"]}


def infer_brand_category(query: str) -> str:
    text = (query or "").lower()
    rules = [
        ("innerwear", ["underwear", "brief", "innerwear", "vest"]),
        ("towel_bedding", ["towel", "bedsheet", "bed sheet", "blanket", "pillow", "napkin"]),
        ("footwear", ["shoe", "sneaker", "slipper", "sandal", "footwear"]),
        ("mobile", ["phone", "mobile", "smartphone"]),
        ("laptop", ["laptop", "notebook computer", "jiobook", "primebook"]),
        ("audio_wearables", ["earbud", "headphone", "speaker", "smartwatch", "smart watch", "tws"]),
        ("tv_electronics", ["tv", "television", "monitor"]),
        ("home_appliance", ["fan", "iron", "ac", "air conditioner", "refrigerator", "fridge", "washing machine", "heater", "geyser"]),
        ("kitchen", ["cooker", "kadai", "pan", "cookware", "mixer", "grinder", "kettle", "induction"]),
        ("furniture", ["chair", "table", "desk", "sofa", "bed", "rack", "furniture"]),
        ("plastic_household", ["bucket", "bottle", "plastic", "storage box", "container", "mug"]),
        ("tools", ["tool", "hammer", "screwdriver", "drill", "pliers", "wrench", "saw"]),
        ("steel_materials", ["steel", "metal sheet", "pipe", "tube", "aluminium", "aluminum"]),
        ("clothing", ["shirt", "tshirt", "t-shirt", "jeans", "hoodie", "jacket", "dress", "kurta", "saree"]),
        ("bags", ["bag", "backpack", "rucksack", "luggage", "suitcase"]),
        ("stationery", ["pen", "pencil", "notebook", "stationery", "eraser", "sharpener"]),
        ("sports", ["cricket", "football", "basketball", "badminton", "racket", "sports"]),
        ("toys", ["toy", "doll", "blocks"]),
        ("bicycle", ["cycle", "bicycle", "bike tyre", "bicycle tyre"]),
    ]
    for category, keywords in rules:
        if any(k in text for k in keywords):
            return category
    return "general"


def brands_for_query(query: str) -> dict[str, list[str]]:
    category = infer_brand_category(query)
    return CATEGORY_BRANDS.get(category, {"indian": [], "international": []})


def classify_brand(brand: str | None) -> str:
    if not brand:
        return "unknown"
    normalized = re.sub(r"\s+", " ", brand.strip().lower())
    if normalized in INDIAN_BRANDS:
        return "indian"
    if normalized in INTERNATIONAL_BRANDS:
        return "international"
    return "unknown"


def brand_priority(brand: str | None) -> int:
    kind = classify_brand(brand)
    return {"indian": 0, "unknown": 1, "international": 2}[kind]
