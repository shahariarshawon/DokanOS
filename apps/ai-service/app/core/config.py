import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "DokanOS AI Service"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Database (NeonDB / PostgreSQL with pgvector)
    DATABASE_URL: str = (
        "postgresql://neondb_owner:npg_DrKkwxLf2hC1@ep-empty-block-b32n6mx4-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    )

    # LLM Providers (Optional - fallback generator used if not provided)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Internal Security Secret
    INTERNAL_API_KEY: str = "dokanos_internal_ai_secret_dev_2026"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
