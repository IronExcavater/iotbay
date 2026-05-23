from test.e2e.flows.auth import SignInFlow
from test.e2e.pages.cart import CartPage
from test.e2e.pages.orders import OrdersPage
from test.e2e.support.browser import WEB_URL, SeleniumE2ETestCase


class OrdersSeleniumAcceptanceTestCase(SeleniumE2ETestCase):
    def _create_product_and_login(self):
        """Helper: create a product via API and sign in as customer."""
        from test.shared.users import create_staff

        staff = create_staff(self.fixture.user_repository)
        from test.shared.http import JsonHttpClient

        http = JsonHttpClient("http://localhost:5001", api_key="test-api-key")
        from test.api.support.clients import AuthApi

        auth = AuthApi(http)
        auth.login_customer(email=staff.email, password=staff.password)
        resp = http.post(
            "/api/admin/products",
            {
                "name": "Test Sensor",
                "code": "E2E-001",
                "mediaUrls": [],
                "priceCents": 2500,
                "stock": 20,
                "type": "Sensor",
            },
        )
        product_id = resp.body["id"]

        customer = self.create_customer()
        SignInFlow(self).sign_in(email=customer.email, password=customer.password)
        return product_id, customer

    def test_empty_orders_page_shows_placeholder(self):
        """AC: new customer sees 'No orders yet' message."""
        customer = self.create_customer()
        SignInFlow(self).sign_in(email=customer.email, password=customer.password)

        page = OrdersPage(self)
        page.open()

        self.wait_for_text("No orders yet")

    def test_place_order_from_cart_and_view_in_orders(self):
        """AC: full checkout flow — add to cart, place order, see in orders."""
        product_id, customer = self._create_product_and_login()

        self.driver.get(f"{WEB_URL}/products/{product_id}")
        self.click_when_ready("//button[contains(., 'Add to cart')]", by="xpath")

        cart = CartPage(self)
        cart.open()
        self.wait_for_text("Test Sensor")

        from selenium.webdriver.common.by import By

        address_fields = self.driver.find_elements(
            By.CSS_SELECTOR, "[name='addressLineOne']"
        )
        if address_fields:
            address_fields[0].send_keys("1 Test St")

        cart.fill_payment(
            name="Test User",
            card="4242424242424242",
            expiry="12/30",
            cvc="123",
        )
        cart.accept_terms()
        cart.place_order()

        self.wait_for_text("Orders")
        self.wait_for_text("saved")

    def test_cancel_order_from_orders_page(self):
        """AC: customer can cancel a saved order from the UI."""
        product_id, customer = self._create_product_and_login()

        from test.shared.http import JsonHttpClient

        http = JsonHttpClient("http://localhost:5001", api_key="test-api-key")
        from test.api.support.clients import AuthApi

        auth = AuthApi(http)
        auth.login_customer(email=customer.email, password=customer.password)
        http.post(
            "/api/orders",
            {
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )

        page = OrdersPage(self)
        page.open()
        self.wait_for_text("saved")

        page.click_cancel_button()

        self.wait_for_text("cancelled")

    def test_search_orders_by_date(self):
        """AC: customer can filter orders using the date picker."""
        product_id, customer = self._create_product_and_login()

        from test.shared.http import JsonHttpClient

        http = JsonHttpClient("http://localhost:5001", api_key="test-api-key")
        from test.api.support.clients import AuthApi

        auth = AuthApi(http)
        auth.login_customer(email=customer.email, password=customer.password)
        http.post(
            "/api/orders",
            {
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )

        page = OrdersPage(self)
        page.open()
        self.wait_for_text("saved")

        date_input = self.driver.find_element("css selector", "#search-date")
        date_input.send_keys("2999-01-01")
        self.click_when_ready("//button[normalize-space()='Search']", by="xpath")

        import time

        time.sleep(1)
        self.assertFalse(page.has_text("saved"))
