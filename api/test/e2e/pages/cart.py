from test.e2e.support.browser import WEB_URL, SeleniumE2ETestCase


class CartPage:
    def __init__(self, case: SeleniumE2ETestCase) -> None:
        self.case = case

    def open(self) -> None:
        self.case.driver.get(f"{WEB_URL}/cart")

    def is_empty(self) -> bool:
        return "Your cart is empty" in self.case.driver.page_source

    def item_count(self) -> int:
        return len(self.case.driver.find_elements("css selector", "ul > li"))

    def fill_payment(self, *, name: str, card: str, expiry: str, cvc: str) -> None:
        driver = self.case.driver
        driver.find_element("css selector", "[autocomplete='cc-name']").send_keys(name)
        driver.find_element("css selector", "[autocomplete='cc-number']").send_keys(
            card
        )
        driver.find_element("css selector", "[autocomplete='cc-exp']").send_keys(expiry)
        driver.find_element("css selector", "[autocomplete='cc-csc']").send_keys(cvc)

    def accept_terms(self) -> None:
        self.case.click_when_ready("[type='checkbox']")
        # Accept in the dialog
        self.case.click_when_ready("//button[normalize-space()='Accept']", by="xpath")

    def place_order(self) -> None:
        self.case.click_when_ready(
            "//button[normalize-space()='Place order']", by="xpath"
        )
