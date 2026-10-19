from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Environment
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    APP_NAME: str = "QueryTrust AI"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql://app_user:querytrust_app_dev@localhost:5432/querytrust"
    READONLY_DATABASE_URL: Optional[str] = None
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # Security
    SECRET_KEY: str = "dev-super-secret-key-change-in-production-querytrust-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # LLM Provider: 'demo' | 'gemini' | 'openai_compatible'
    LLM_PROVIDER: str = "demo"
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,https://querytrustai-mauve.vercel.app,https://querytrustai.vercel.app"

    # Execution safeguards
    MAX_QUERY_ROWS: int = 200
    QUERY_TIMEOUT_SECONDS: int = 5
    RATE_LIMIT_PER_MINUTE: int = 60

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    @property
    def sqlalchemy_readonly_database_url(self) -> str:
        url = self.READONLY_DATABASE_URL
        if not url:
            url = self.DATABASE_URL
        elif ("localhost" in url or "127.0.0.1" in url) and ("localhost" not in self.DATABASE_URL and "127.0.0.1" not in self.DATABASE_URL):
            # Remote cloud database configured (e.g. Render/Neon/Supabase), but reader points to local host
            url = self.DATABASE_URL

        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url


@lru_cache()
def get_settings() -> Settings:
    return Settings()
