from e2e.pages.account import AccountPage
from e2e.support.browser import SeleniumE2ETestCase


class AccessLogsPage:
    def __init__(self, case: SeleniumE2ETestCase) -> None:
        self.case = case

    def open_account_security(self) -> None:
        account = AccountPage(self.case)
        account.open()
        account.open_security_tab()

    def search_logs(self, query: str) -> None:
        field = self.case.driver.find_element(
            "css selector",
            "input[placeholder='Search logs']",
        )
        field.clear()
        field.send_keys(query)

    def filter_after_today(self) -> None:
        driver = self.case.driver
        driver.find_element(
            "css selector",
            "[aria-label='Filter logs after date']",
        ).click()
        driver.find_element("xpath", "//button[normalize-space()='Today']").click()

    def has_text(self, text: str) -> bool:
        return text in self.case.driver.find_element("tag name", "body").text
