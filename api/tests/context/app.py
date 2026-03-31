from pathlib import Path
from shutil import copyfile

from flask.testing import FlaskClient
from src.app import create_app
from src.config import load_app_config

TEST_CONFIG_PATH = Path(__file__).resolve().parents[2] / "config" / "test.json"


# Returns FlaskClient and resolved database path
def create_test_client(temp_dir: Path) -> tuple[FlaskClient, str]:
    config_dir = temp_dir / "config"
    config_dir.mkdir()

    config_path = config_dir / "test.json"
    copyfile(TEST_CONFIG_PATH, config_path)

    config = load_app_config(config_path)
    app = create_app(str(config_path))
    app.testing = True
    return app.test_client(), config.database_path
