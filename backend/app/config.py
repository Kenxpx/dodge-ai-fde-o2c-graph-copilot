from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Dodge AI O2C Graph Copilot"
    app_env: str = "development"
    base_dir: Path = Field(default_factory=lambda: Path(__file__).resolve().parents[2])
    dataset_root: Path | None = None
    db_path: Path | None = None
    frontend_origin: str = "http://localhost:5173"
    llm_provider: Literal["none", "gemini", "openai_compatible"] = "none"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    openai_api_key: str | None = None
    openai_base_url: str = "https://openrouter.ai/api/v1"
    openai_model: str = "openai/gpt-4.1-mini"
    max_query_rows: int = 200
    initial_flow_limit: int = 6
    graph_neighbor_limit: int = 140

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def model_post_init(self, __context: object) -> None:
        if self.dataset_root is None:
            self.dataset_root = self.base_dir / "dataset_unzipped" / "sap-o2c-data"
        if self.db_path is None:
            self.db_path = self.base_dir / "backend" / "data" / "o2c.duckdb"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    return settings
