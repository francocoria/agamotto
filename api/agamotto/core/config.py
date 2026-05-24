from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AGAMOTTO_", env_file=".env", extra="ignore")

    # Paths
    repo_root: Path = Path(__file__).resolve().parents[3]
    data_dir: Path = Path(__file__).resolve().parents[3] / "data"

    # Database
    database_url: str = ""

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_cors_origins: list[str] = ["http://localhost:3000"]

    # Simulation defaults
    simulation_default_runs: int = 100_000
    simulation_seed: int = 42

    # Model versioning
    model_set_version: str = "agamotto_ensemble_0.1.0"

    # External APIs (optional)
    statorium_api_key: str = ""
    api_football_key: str = ""
    open_meteo_base: str = "https://api.open-meteo.com/v1"

    @property
    def db_url(self) -> str:
        if self.database_url:
            return self.database_url
        sqlite_path = self.data_dir / "agamotto.sqlite"
        sqlite_path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{sqlite_path.as_posix()}"

    @property
    def raw_dir(self) -> Path:
        p = self.data_dir / "raw"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def processed_dir(self) -> Path:
        p = self.data_dir / "processed"
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
