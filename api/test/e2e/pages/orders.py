from test.e2e.support.browser import WEB_URL, SeleniumE2ETestCase


class OrdersPage:
    def __init__(self, case: SeleniumE2ETestCase) -> None:
        self.case = case

    def open(self) -> None:
        self.case.driver.get(f"{WEB_URL}/orders")

    def order_count(self) -> int:
        items = self.case.driver.find_elements("css selector", "ul > li")
        return len(items)

    def first_order_status(self) -> str:
        badge = self.case.driver.find_element("css selector", "[class*='rounded-full']")
        return badge.text.strip().lower()

    def click_cancel_button(self) -> None:
        self.case.click_when_ready("button[class*='danger']")

    def click_edit_address(self) -> None:
        self.case.click_when_ready("[aria-label='Edit address']")

    def fill_address(
        self, *, line1: str, suburb: str, state: str, postcode: str, country: str
    ) -> None:
        driver = self.case.driver
        fields = {
            "addressLineOne": line1,
            "suburb": suburb,
            "state": state,
            "postcode": postcode,
            "country": country,
        }
        for name, value in fields.items():
            field = driver.find_element("css selector", f"[name='{name}']")
            field.clear()
            field.send_keys(value)

    def click_save_address(self) -> None:
        self.case.click_when_ready("//button[normalize-space()='Save']", by="xpath")

    def has_text(self, text: str) -> bool:
        return text in self.case.driver.find_element("tag name", "body").text
