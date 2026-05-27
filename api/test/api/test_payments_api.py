import unittest
from unittest.mock import patch

from test.api.support.case import ApiAcceptanceTestCase
from test.shared.http import JsonHttpClient

PAY_REQUEST: dict[str, object] = {
    "cardNumber": "4111111111111111",
    "cardHolder": "Jane Smith",
    "expiry": "12/28",
}

FAIL_CARD_REQUEST: dict[str, object] = {
    "cardNumber": "4111111111110000",
    "cardHolder": "Jane Smith",
    "expiry": "12/28",
}

SIMULATE = "src.payments.service.PaymentService._simulate_payment"


def _create_product(http: JsonHttpClient) -> dict[str, object]:
    body: dict[str, object] = {
        "name": "Test IoT Sensor",
        "code": "IOT-PAY-001",
        "priceCents": 4999,
        "stock": 10,
        "type": "Sensor",
        "mediaUrls": [],
    }
    r = http.post("/api/admin/products", body)
    assert r.status == 201, r.body
    return r.body  # type: ignore[return-value]


def _create_order(http: JsonHttpClient, *, product_id: str) -> dict[str, object]:
    body: dict[str, object] = {
        "addressId": None,
        "items": [{"productId": product_id, "quantity": 1}],
    }
    r = http.post("/api/orders", body)
    assert r.status == 201, r.body
    return r.body  # type: ignore[return-value]


class PaymentApiTestCase(ApiAcceptanceTestCase):
    def _setup_order(
        self, email: str = "pay.api@example.com"
    ) -> tuple[object, dict[str, object]]:
        from src.auth.security import hash_password
        from src.users.models import USER_STATUS_ACTIVE, USER_TYPE_STAFF

        customer = self.given_logged_in_customer(email=email)
        self.auth.logout()

        self.fixture.user_repository.insert_user(
            email="pay.staff@example.com",
            password_hash=hash_password("StaffPass9$"),
            first_name="Pay",
            last_name="Staff",
            user_type=USER_TYPE_STAFF,
            status=USER_STATUS_ACTIVE,
            designation="Sales",
            permission="admin",
        )
        staff_http = JsonHttpClient(self.fixture.base_url, api_key=self.fixture.api_key)
        staff_http.post(
            "/api/login",
            {
                "email": "pay.staff@example.com",
                "password": "StaffPass9$",
                "userType": "staff",
            },
        )
        product = _create_product(staff_http)
        staff_http.post("/api/logout")

        self.http.post(
            "/api/login",
            {
                "email": customer.email,
                "password": customer.password,
                "userType": "customer",
            },
        )
        order = _create_order(self.http, product_id=str(product["id"]))
        return customer, order

    def _create_saved_method(self) -> str:
        """Create a saved payment method for the logged-in customer."""
        body: dict[str, object] = {
            "type": "Visa",
            "cardholderName": "Jane Smith",
            "cardNumber": "4111111111114242",
            "expiry": "12/30",
        }
        r = self.http.post("/api/payment-methods", body)
        assert r.status == 201, r.body
        return str(r.body["id"])  # type: ignore[index]

    def test_pay_order_success_returns_payment_record(self) -> None:
        _, order = self._setup_order()

        with patch(SIMULATE, return_value=True):
            r = self.http.post(f"/api/orders/{order['id']}/pay", PAY_REQUEST)

        self.assertEqual(r.status, 200)
        self.assertEqual(r.body["status"], "success")
        self.assertEqual(r.body["cardLast4"], "1111")
        self.assertEqual(r.body["cardHolder"], "Jane Smith")
        self.assertIn("paidAt", r.body)

    def test_pay_order_with_saved_method_via_body(self) -> None:
        """AC: paymentMethodId in body uses saved card details."""
        _, order = self._setup_order(email="savedpay.body@example.com")
        method_id = self._create_saved_method()
        body: dict[str, object] = {"paymentMethodId": method_id}

        with patch(SIMULATE, return_value=True):
            r = self.http.post(
                f"/api/orders/{order['id']}/pay",
                body,
            )

        self.assertEqual(r.status, 200)
        self.assertEqual(r.body["status"], "success")
        self.assertEqual(r.body["cardLast4"], "4242")
        self.assertIsNotNone(r.body["paymentMethodId"])

    def test_pay_order_via_saved_method_url(self) -> None:
        """AC: convenience endpoint pays order from a saved method URL."""
        _, order = self._setup_order(email="savedpay.url@example.com")
        method_id = self._create_saved_method()
        empty: dict[str, object] = {}

        with patch(SIMULATE, return_value=True):
            r = self.http.post(
                f"/api/payment-methods/{method_id}/pay/{order['id']}",
                empty,
            )

        self.assertEqual(r.status, 200)
        self.assertEqual(r.body["status"], "success")
        self.assertEqual(r.body["cardLast4"], "4242")

    def test_pay_order_with_fail_card_returns_402(self) -> None:
        _, order = self._setup_order(email="fail.api@example.com")

        r = self.http.post(f"/api/orders/{order['id']}/pay", FAIL_CARD_REQUEST)

        self.assertEqual(r.status, 402)
        self.assertEqual(r.body["code"], "PAYMENT_DECLINED")

    def test_pay_nonexistent_order_returns_404(self) -> None:
        self.given_logged_in_customer(email="notfound.api@example.com")
        r = self.http.post(
            "/api/orders/00000000-0000-0000-0000-000000000001/pay",
            PAY_REQUEST,
        )
        self.assertEqual(r.status, 404)

    def test_pay_order_requires_authentication(self) -> None:
        anon = JsonHttpClient(self.fixture.base_url, api_key=self.fixture.api_key)
        r = anon.post(
            "/api/orders/00000000-0000-0000-0000-000000000001/pay",
            PAY_REQUEST,
        )
        self.assertEqual(r.status, 401)

    def test_pay_already_paid_order_returns_409(self) -> None:
        _, order = self._setup_order(email="already.api@example.com")

        with patch(SIMULATE, return_value=True):
            self.http.post(f"/api/orders/{order['id']}/pay", PAY_REQUEST)
            second = self.http.post(f"/api/orders/{order['id']}/pay", PAY_REQUEST)

        self.assertEqual(second.status, 409)
        self.assertEqual(second.body["code"], "ORDER_ALREADY_PAID")

    def test_pay_order_rejects_invalid_card_number(self) -> None:
        _, order = self._setup_order(email="badcard.api@example.com")
        body: dict[str, object] = {
            "cardNumber": "not-a-number",
            "cardHolder": "Jane",
            "expiry": "12/28",
        }
        r = self.http.post(f"/api/orders/{order['id']}/pay", body)
        self.assertEqual(r.status, 400)

    def test_get_payment_returns_record_after_successful_pay(
        self,
    ) -> None:
        _, order = self._setup_order(email="getpay.api@example.com")

        with patch(SIMULATE, return_value=True):
            self.http.post(f"/api/orders/{order['id']}/pay", PAY_REQUEST)

        r = self.http.get(f"/api/orders/{order['id']}/payment")
        self.assertEqual(r.status, 200)
        self.assertEqual(r.body["status"], "success")
        self.assertEqual(r.body["orderId"], order["id"])

    def test_get_payment_returns_404_when_no_payment_exists(self) -> None:
        _, order = self._setup_order(email="nopay.api@example.com")
        r = self.http.get(f"/api/orders/{order['id']}/payment")
        self.assertEqual(r.status, 404)
        self.assertEqual(r.body["code"], "PAYMENT_NOT_FOUND")

    def test_list_payments_returns_customer_payments(self) -> None:
        _, order = self._setup_order(email="listpay.api@example.com")

        with patch(SIMULATE, return_value=True):
            self.http.post(f"/api/orders/{order['id']}/pay", PAY_REQUEST)

        r = self.http.get("/api/payments")
        self.assertEqual(r.status, 200)
        self.assertEqual(len(r.body["items"]), 1)
        self.assertEqual(r.body["items"][0]["status"], "success")

    def test_list_payments_empty_when_none_made(self) -> None:
        self.given_logged_in_customer(email="emptypay.api@example.com")
        r = self.http.get("/api/payments")
        self.assertEqual(r.status, 200)
        self.assertEqual(r.body["items"], [])


if __name__ == "__main__":
    unittest.main()
