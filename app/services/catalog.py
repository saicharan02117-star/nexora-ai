import json
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"


def _load(name: str) -> list[dict[str, Any]]:
    with (DATA_DIR / name).open("r", encoding="utf-8") as f:
        return json.load(f)


def products() -> list[dict[str, Any]]:
    return _load("products.json")


def event_vendors() -> list[dict[str, Any]]:
    return _load("event_vendors.json")
