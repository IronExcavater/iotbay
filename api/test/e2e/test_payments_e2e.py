"""
End-to-end (Selenium) test for the payment flow.

Requires Chrome + ChromeDriver and a running Vite dev server.
The test is automatically skipped if either is unavailable, matching the
existing pattern in test/e2e/test_access_logs_selenium.py.

Flow tested:
  1. Customer signs in.
  2. Customer navigates to the cart page.
  3. Customer places an order and proceeds to checkout / payment.
  4. Customer fills in card details and submits.
  5. Success confirmation is visible on the page.

NOTE: The test depends on the frontend cart/checkout UI being wired to the
payment API.  Until that wiring is complete the test will navigate to the
orders page and verify that a paid order is shown in the list.
"""

import unittest
from unittest.mock import patch

from test.e2e.flows.auth import SignInFlow
from test.e2e.support.browser import WEB_URL, SeleniumE2ETestCase


class PaymentE2ETestCase(SeleniumE2ETestCase):
    """Selenium acceptance tests for the payment feature."""

    # Helpers

    def _create_product_for_customer(self) -> str:
        """Insert a product directly via the live API and return its ID."""
        from src.auth.security import hash_password
        from src.users.models import USER_STATUS_ACTIVE, USER_TYPE_STAFF

        from test.shared.live_app import JsonHttpClient

        staff_repo = self.fixture.user_repository
        staff_repo.insert_user(
            email="e2e.staff@example.com",
            password_hash=hash_password("StaffPass9$"),
            first_name="E2E",
            last_name="Staff",
            user_type=USER_TYPE_STAFF,
            status=USER_STATUS_ACTIVE,
            designation="QA",
            permission="admin",
        )

        client = JsonHttpClient(self.fixture.base_url, api_key=self.fixture.api_key)
        client.post(
            "/api/login",
            {
                "email": "e2e.staff@example.com",
                "password": "StaffPass9$",
                "userType": "staff",
            },
        )
        product_response = client.post(
            "/api/admin/products",
            {
                "name": "E2E IoT Device",
                "code": "E2E-IOT-001",
                "priceCents": 2999,
                "stock": 5,
                "type": "Sensor",
                "mediaUrls": [],
            },
        )
        client.post("/api/logout")
        return product_response.body["id"]

    def _api_pay_order(
        self,
        *,
        customer_email: str,
        customer_password: str,
        product_id: str,
    ) -> None:
        """Place and pay an order via the API so the UI can show a paid state."""
        from test.shared.live_app import JsonHttpClient

        client = JsonHttpClient(self.fixture.base_url, api_key=self.fixture.api_key)
        client.post(
            "/api/login",
            {
                "email": customer_email,
                "password": customer_password,
                "userType": "customer",
            },
        )
        order_response = client.post(
            "/api/orders",
            {
                "addressId": None,
                "items": [{"productId": product_id, "quantity": 1}],
            },
        )
        order_id = order_response.body["id"]

        with patch(
            "src.payments.service.PaymentService._simulate_payment",
            return_value=True,
        ):
            client.post(
                f"/api/orders/{order_id}/pay",
                {
                    "cardNumber": "4111111111111111",
                    "cardHolder": "E2E Customer",
                    "expiry": "12/30",
                },
            )
        client.post("/api/logout")

    # Test: paid order is visible on the orders page

    def test_paid_order_appears_on_orders_page(self) -> None:
        """AC: after a successful simulated payment the order status shows 'paid'
        on the orders history page."""
        customer = self.create_customer(
            email="e2e.pay@example.com",
            password="LogPass99$",
        )
        product_id = self._create_product_for_customer()
        self._api_pay_order(
            customer_email=customer.email,
            customer_password=customer.password,
            product_id=product_id,
        )

        # Sign into the UI and navigate to orders
        SignInFlow(self).sign_in(
            email=customer.email,
            password=customer.password,
        )
        self.driver.get(f"{WEB_URL}/orders")
        self.wait_for_text("paid")

    # Test: unauthenticated user is redirected away from orders page

    def test_unauthenticated_user_cannot_access_orders_page(self) -> None:
        """AC: visiting /orders without being logged in redirects to sign-in."""
        self.driver.get(f"{WEB_URL}/orders")
        self.wait_for_text("Sign in")


if __name__ == "__main__":
    unittest.main()
