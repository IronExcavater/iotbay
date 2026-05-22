"""
API acceptance tests for the payment endpoints.

Uses LiveAppFixture (real HTTP server with temp SQLite DB) matching the
pattern in test/api/test_access_logs_api.py.

Endpoints exercised:
  POST /api/orders/<order_id>/pay
  GET  /api/orders/<order_id>/payment
  GET  /api/payments
"""
import unittest
from unittest.mock import patch

from test.api.support.case import ApiAcceptanceTestCase
from test.shared.live_app import JsonHttpClient


# ---------------------------------------------------------------------------
# Helper: create an order via the API
# ---------------------------------------------------------------------------

def _create_order_via_api(http: JsonHttpClient, *, product_id: str) -> dict:
    response = http.post(
        "/api/orders",
        {
            "addressId": None,
            "items": [{"productId": product_id, "quantity": 1}],
        },
    )
    assert response.status == 201, f"Expected 201 but got {response.status}: {response.body}"
    return response.body


def _create_product_via_api(http: JsonHttpClient) -> dict:
    """Create a product using staff credentials so we have something to order."""
    response = http.post(
        "/api/admin/products",
        {
            "name": "Test IoT Sensor",
            "code": "IOT-TST-001",
            "priceCents": 4999,
            "stock": 10,
            "type": "Sensor",
            "mediaUrls": [],
        },
    )
    assert response.status == 201, f"Expected 201 but got {response.status}: {response.body}"
    return response.body


PAY_REQUEST = {
    "cardNumber": "4111111111111111",
    "cardHolder": "Jane Smith",
    "expiry": "12/28",
}

FAIL_CARD_REQUEST = {
    "cardNumber": "4111111111110000",
    "cardHolder": "Jane Smith",
    "expiry": "12/28",
}


class PaymentApiTestCase(ApiAcceptanceTestCase):
    """Tests for POST /api/orders/<id>/pay and related endpoints."""

    # ------------------------------------------------------------------
    # Set up: staff creates a product, customer logs in and creates order
    # ------------------------------------------------------------------

    def _setup_order(self, email: str = "pay.api@example.com") -> tuple[dict, dict]:
        """Return (customer_dict, order_dict) after logging in and creating an order."""
        customer = self.given_logged_in_customer(email=email)

        # Log out so we can use a staff account to create the product
        self.auth.logout()

        # Staff creates product
        staff_http = JsonHttpClient(self.fixture.base_url, api_key=self.fixture.api_key)
        from test.shared.users import create_customer
        from src.auth.security import hash_password
        from src.users.models import USER_STATUS_ACTIVE, USER_TYPE_STAFF
        staff_repo = self.fixture.user_repository
        staff_user = staff_repo.insert_user(
            email="pay.staff@example.com",
            password_hash=hash_password("StaffPass9$"),
            first_name="Pay",
            last_name="Staff",
            user_type=USER_TYPE_STAFF,
            status=USER_STATUS_ACTIVE,
            designation="Sales",
            permission="admin",
        )
        staff_http.post(
            "/api/login",
            {"email": "pay.staff@example.com", "password": "StaffPass9$", "userType": "staff"},
        )
        product = _create_product_via_api(staff_http)
        staff_http.post("/api/logout")

        # Customer logs back in and creates an order
        self.http.post(
            "/api/login",
            {"email": customer.email, "password": customer.password, "userType": "customer"},
        )
        order = _create_order_via_api(self.http, product_id=product["id"])
        return customer, order

    # ------------------------------------------------------------------
    # Pay order — success
    # ------------------------------------------------------------------

    def test_pay_order_succeeds_and_returns_payment_record(self) -> None:
        """AC: POST /pay with valid card returns 200 and a payment record."""
        _, order = self._setup_order()

        with patch(
            "src.payments.service.PaymentService._simulate_payment",
            return_value=True,
        ):
            response = self.http.post(f"/api/orders/{order['id']}/pay", PAY_REQUEST)

        self.assertEqual(response.status, 200)
        payload = response.body
        self.assertIsNotNone(payload)
        self.assertEqual(payload["status"], "success")
        self.assertEqual(payload["cardLastFour"], "1111")
        self.assertEqual(payload["cardHolder"], "Jane Smith")
        self.assertIn("paidAt", payload)

    # ------------------------------------------------------------------
    # Pay order — declined
    # ------------------------------------------------------------------

    def test_pay_order_with_fail_card_returns_402(self) -> None:
        """AC: a card ending 0000 is always declined; returns 402."""
        _, order = self._setup_order(email="fail.api@example.com")

        response = self.http.post(
            f"/api/orders/{order['id']}/pay",
            FAIL_CARD_REQUEST,
        )

        self.assertEqual(response.status, 402)
        self.assertEqual(response.body["code"], "PAYMENT_DECLINED")

    # ------------------------------------------------------------------
    # Pay order — order not found
    # ------------------------------------------------------------------

    def test_pay_nonexistent_order_returns_404(self) -> None:
        """AC: paying a random UUID returns 404."""
        customer = self.given_logged_in_customer(email="notfound.api@example.com")
        fake_id = "00000000-0000-0000-0000-000000000001"

        response = self.http.post(f"/api/orders/{fake_id}/pay", PAY_REQUEST)

        self.assertEqual(response.status, 404)

    # ------------------------------------------------------------------
    # Pay order  (paid) 
    # ------------------------------------------------------------------

    def test_pay_already_paid_order_returns_409(self) -> None:
        """AC: paying an already-paid order returns 409 ORDER_ALREADY_PAID."""
        _, order = self._setup_order(email="already.api@example.com")

        # Pay once (success)
        with patch(
            "src.payments.service.PaymentService._simulate_payment",
            return_value=True,
        ):
            first = self.http.post(f"/api/orders/{order['id']}/pay", PAY_REQUEST)
        self.assertEqual(first.status, 200)

        # Pay again
        with patch(
            "src.payments.service.PaymentService._simulate_payment",
            return_value=True,
        ):
            second = self.http.post(f"/api/orders/{order['id']}/pay", PAY_REQUEST)
        self.assertEqual(second.status, 409)
        self.assertEqual(second.body["code"], "ORDER_ALREADY_PAID")

    # ------------------------------------------------------------------
    # Pay order  (authentication required)
    # ------------------------------------------------------------------

    def test_pay_order_requires_authentication(self) -> None:
        """AC: unauthenticated request returns 401."""
        unauthenticated = JsonHttpClient(
            self.fixture.base_url, api_key=self.fixture.api_key
        )
        fake_id = "00000000-0000-0000-0000-000000000001"

        response = unauthenticated.post(f"/api/orders/{fake_id}/pay", PAY_REQUEST)

        self.assertEqual(response.status, 401)

    # ------------------------------------------------------------------
    # Get payment for order
    # ------------------------------------------------------------------

    def test_get_payment_returns_payment_after_successful_pay(self) -> None:
        """AC: GET /api/orders/<id>/payment returns the stored payment."""
        _, order = self._setup_order(email="getpay.api@example.com")

        with patch(
            "src.payments.service.PaymentService._simulate_payment",
            return_value=True,
        ):
            self.http.post(f"/api/orders/{order['id']}/pay", PAY_REQUEST)

        response = self.http.get(f"/api/orders/{order['id']}/payment")

        self.assertEqual(response.status, 200)
        self.assertEqual(response.body["status"], "success")
        self.assertEqual(response.body["orderId"], order["id"])

    def test_get_payment_returns_404_when_no_payment_exists(self) -> None:
        """AC: GET /payment on an unpaid order returns 404."""
        _, order = self._setup_order(email="nopay.api@example.com")

        response = self.http.get(f"/api/orders/{order['id']}/payment")

        self.assertEqual(response.status, 404)
        self.assertEqual(response.body["code"], "PAYMENT_NOT_FOUND")

    # ------------------------------------------------------------------
    # List of my payments
    # ------------------------------------------------------------------

    def test_list_payments_returns_all_customer_payments(self) -> None:
        """AC: GET /api/payments returns a list of the customer's payments."""
        _, order = self._setup_order(email="listpay.api@example.com")

        with patch(
            "src.payments.service.PaymentService._simulate_payment",
            return_value=True,
        ):
            self.http.post(f"/api/orders/{order['id']}/pay", PAY_REQUEST)

        response = self.http.get("/api/payments")

        self.assertEqual(response.status, 200)
        self.assertIsInstance(response.body["items"], list)
        self.assertEqual(len(response.body["items"]), 1)
        self.assertEqual(response.body["items"][0]["status"], "success")

    def test_list_payments_empty_when_no_payments_made(self) -> None:
        """AC: GET /api/payments returns an empty list if the customer has not paid."""
        self.given_logged_in_customer(email="emptypay.api@example.com")

        response = self.http.get("/api/payments")

        self.assertEqual(response.status, 200)
        self.assertEqual(response.body["items"], [])

    # ------------------------------------------------------------------
    # Invalid card payload :
    # ------------------------------------------------------------------

    def test_pay_order_rejects_invalid_card_number(self) -> None:
        """AC: a non-numeric card number returns 400."""
        _, order = self._setup_order(email="badcard.api@example.com")

        response = self.http.post(
            f"/api/orders/{order['id']}/pay",
            {
                "cardNumber": "not-a-number",
                "cardHolder": "Jane",
                "expiry": "12/28",
            },
        )

        self.assertEqual(response.status, 400)


if __name__ == "__main__":
    unittest.main()
