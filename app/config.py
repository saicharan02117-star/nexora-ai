from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Nexora AI"
    app_env: str = "development"
    demo_mode: bool = True
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    llm_endpoint: str = ""
    llm_api_key: str = ""
    llm_model: str = ""

    @field_validator("demo_mode", mode="before")
    @classmethod
    def normalize_demo_mode(cls, value):
        if value is None or value == "":
            return True
        return value

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
