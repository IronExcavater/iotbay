import json
from pathlib import Path

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = ROOT_DIR / "config" / "app.json"
DEFAULT_ENV_PATH = ROOT_DIR / ".env"


class SmtpSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="IOTBAY_",
        env_file=str(DEFAULT_ENV_PATH),
        extra="ignore",
    )

    smtp_host: str = ""
    smtp_password: str = ""
    smtp_port: int = 587
    smtp_use_tls: bool = True
    smtp_username: str = ""


class EmailConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    sender: str
    smtp_host: str = ""
    smtp_password: str = ""
    smtp_port: int = 587
    smtp_use_tls: bool = True
    smtp_username: str = ""


class AppConfig(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        frozen=True,
        populate_by_name=True,
    )

    cookie_secure: bool
    database_path: str
    email: EmailConfig
    session_cookie_name: str
    session_lifetime_seconds: int
    verification_code_lifetime_seconds: int


def load_app_config(config_path: str | Path | None = None) -> AppConfig:
    path = Path(config_path) if config_path is not None else DEFAULT_CONFIG_PATH
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"config file must contain a JSON object: {path}")

    config = AppConfig.model_validate(payload)
    if not config.database_path:
        raise ValueError("config path values must be non-empty strings")

    database_path = Path(config.database_path)
    return config.model_copy(
        update={
            "database_path": str(
                database_path
                if database_path.is_absolute()
                else (path.parent / database_path).resolve()
            ),
            "email": config.email.model_copy(update=SmtpSettings().model_dump()),
        }
    )
