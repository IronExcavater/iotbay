from pathlib import Path
from shutil import copyfile

from flask.testing import FlaskClient
from src.addresses.service import AddressService
from src.app import create_app
from src.common.app import services_from
from src.config import load_app_config

TEST_CONFIG_PATH = Path(__file__).resolve().parents[2] / "config" / "test.json"


def create_test_app_client(
    temp_dir: Path,
    *,
    address_service: AddressService | None = None,
) -> tuple[FlaskClient, str]:
    config_dir = temp_dir / "config"
    config_dir.mkdir()

    config_path = config_dir / "test.json"
    copyfile(TEST_CONFIG_PATH, config_path)

    config = load_app_config(config_path)
    app = create_app(str(config_path))
    app.testing = True
    if address_service is not None:
        services_from(app).address = address_service

    client = app.test_client()
    api_key = app.config.get("API_ACCESS_KEY")
    if isinstance(api_key, str) and api_key:
        client.environ_base["HTTP_X_API_KEY"] = api_key
    return client, config.database_path
