from pathlib import Path

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BASE_DIR / '.env'

class DatabaseConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix='DB_',
        env_file=ENV_FILE,
        extra='ignore', 
    )
    host: str = 'localhost'
    port: int = 5432
    user: str
    password: str
    name: str

    @computed_field
    @property
    def db_url(self) -> str:
        return f"postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"

class RedisConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix='REDIS_',
        env_file=ENV_FILE,
        extra='ignore',
    )
    host: str = 'localhost'
    port: int = 6379
    db: int = 0

    @computed_field
    @property
    def redis_url(self) -> str:
        return f"redis://{self.host}:{self.port}/{self.db}"

class OcrConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix='OCR_',
        env_file=ENV_FILE,
        extra='ignore',
    )
    azure_endpoint: str = ''
    azure_key: str = ''


class MeiliConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix='MEILI_',
        env_file=ENV_FILE,
        extra='ignore',
    )
    url: str = ''
    key: str = ''


class EmbeddingConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix='EMBED_',
        env_file=ENV_FILE,
        extra='ignore',
    )
    model: str = 'intfloat/multilingual-e5-large'  # 1024-dim, multilingual incl. Russian
    enabled: bool = True


class Config(BaseSettings):
    app_name: str = "Testing"
    debug: bool = False

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Auth cookie flags. Defaults suit local http dev (cookies persist over
    # http://localhost via the Vite proxy). In production set COOKIE_SECURE=true
    # and COOKIE_SAMESITE=none for cross-site HTTPS.
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    storage_dir: str = "storage"

    database: DatabaseConfig = DatabaseConfig()
    redis: RedisConfig = RedisConfig()
    ocr: OcrConfig = OcrConfig()
    meili: MeiliConfig = MeiliConfig()
    embedding: EmbeddingConfig = EmbeddingConfig()

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding='utf-8',
        case_sensitive=False,
        extra='ignore', 
    )

    @computed_field
    @property
    def db_url(self) -> str:
        return self.database.db_url

config = Config()
