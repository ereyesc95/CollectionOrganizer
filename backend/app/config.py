from pydantic_settings import BaseSettings, SettingsConfigDict

from app.paths import DATA_DIR, ensure_data_dir

ensure_data_dir()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="COLLECTION_")

    database_url: str = f"sqlite:///{DATA_DIR / 'collection.db'}"
    covers_folder: str = ""
    autographs_folder: str = ""
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()
