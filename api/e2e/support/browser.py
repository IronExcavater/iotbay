import os
import shutil
import subprocess
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from testing.live_app import DEFAULT_TEST_API_KEY, LiveAppFixture
from testing.users import TestCustomer, create_customer

WEB_PORT = 5173
API_PORT = 5001
WEB_URL = f"http://127.0.0.1:{WEB_PORT}"
ROOT_DIR = Path(__file__).resolve().parents[3]


class SeleniumE2ETestCase(unittest.TestCase):
    fixture: LiveAppFixture
    vite_process: subprocess.Popen[bytes]

    def setUp(self) -> None:
        super().setUp()
        self.driver: Any = None
        try:
            self.fixture = LiveAppFixture(
                api_port=API_PORT,
                web_url=WEB_URL,
            ).__enter__()
        except OSError as error:
            raise unittest.SkipTest(
                f"API port {API_PORT} is unavailable for Selenium E2E tests"
            ) from error

        try:
            self.vite_process = _start_vite()
            _wait_for_url(f"{WEB_URL}/sign-in")
            self.driver = _create_chrome_driver()
            self.driver.set_window_size(1280, 900)
        except Exception:
            self.fixture.__exit__(None, None, None)
            raise

    def tearDown(self) -> None:
        if self.driver is not None:
            self.driver.quit()
        if hasattr(self, "vite_process"):
            self.vite_process.terminate()
            try:
                self.vite_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.vite_process.kill()
                self.vite_process.wait(timeout=10)
        if hasattr(self, "fixture"):
            self.fixture.__exit__(None, None, None)
        super().tearDown()

    def create_customer(
        self,
        *,
        email: str = "selenium.access@example.com",
        password: str = "LogPass99$",
    ) -> TestCustomer:
        return create_customer(
            self.fixture.user_repository,
            email=email,
            password=password,
        )

    def wait_for_text(self, text: str) -> None:
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support import expected_conditions as ec
        from selenium.webdriver.support.ui import WebDriverWait

        WebDriverWait(self.driver, 10).until(
            ec.presence_of_element_located((By.XPATH, f"//*[contains(., '{text}')]"))
        )


def _start_vite() -> subprocess.Popen[bytes]:
    npm = shutil.which("npm")
    if npm is None:
        raise unittest.SkipTest("npm is required to run Selenium E2E tests")

    return subprocess.Popen(
        [
            npm,
            "run",
            "dev",
            "--",
            "--host",
            "127.0.0.1",
            "--port",
            str(WEB_PORT),
            "--strictPort",
        ],
        cwd=ROOT_DIR / "web",
        env={
            **dict(os.environ),
            "IOTBAY_API_KEY": DEFAULT_TEST_API_KEY,
        },
        stderr=subprocess.STDOUT,
        stdout=subprocess.DEVNULL,
    )


def _wait_for_url(url: str) -> None:
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return
        except urllib.error.URLError:
            time.sleep(0.25)
    raise unittest.SkipTest(f"Vite dev server did not start at {url}")


def _create_chrome_driver():
    try:
        from selenium import webdriver
        from selenium.common import WebDriverException
        from selenium.webdriver.chrome.options import Options
    except ImportError as error:
        raise unittest.SkipTest("selenium is required to run E2E tests") from error

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--window-size=1280,900")
    try:
        return webdriver.Chrome(options=options)
    except WebDriverException as error:
        raise unittest.SkipTest("Chrome or ChromeDriver is unavailable") from error
