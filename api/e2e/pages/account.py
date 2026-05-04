from e2e.support.browser import WEB_URL, SeleniumE2ETestCase


class AccountPage:
    def __init__(self, case: SeleniumE2ETestCase) -> None:
        self.case = case

    def open(self) -> None:
        self.case.driver.get(f"{WEB_URL}/account")
        self.case.wait_for_text("Access Customer")

    def open_security_tab(self) -> None:
        self.case.click_when_ready(
            "//button[normalize-space()='Security']",
            by="xpath",
        )
        self.case.wait_for_text("Access logs")
