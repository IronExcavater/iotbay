import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from flask.testing import FlaskClient
from src.addresses.service import AddressService
from tests.helpers.test_app import create_test_app_client


class AppTestCase(unittest.TestCase):
    client: FlaskClient
    database_path: str

    def setUp(self) -> None:
        super().setUp()
        self.enterContext(
            patch.dict(
                os.environ,
                self.environment_overrides(),
            )
        )
        temp_dir = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.client, self.database_path = create_test_app_client(
            temp_dir,
            address_service=self.address_service_override(),
        )

    def address_service_override(self) -> AddressService | None:
        return None

    def environment_overrides(self) -> dict[str, str]:
        return {}
