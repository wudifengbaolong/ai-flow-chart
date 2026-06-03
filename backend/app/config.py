import json
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # PostgreSQL (fallback to SQLite for local dev without Docker)
    DATABASE_URL: str = "sqlite+aiosqlite:///./ai_flow.db"

    # Redis (optional, disabled if not available)
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "change-me-to-a-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    # CORS
    CORS_ORIGINS: str = '["http://localhost:5173"]'

    # AI Rate Limit
    AI_RATE_LIMIT: int = 10

    @property
    def cors_origins_list(self) -> list[str]:
        return json.loads(self.CORS_ORIGINS)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
