from test.api.support.case import ApiAcceptanceTestCase
from test.shared.users import create_staff

VALID_METHOD: dict[str, object] = {
    "type": "Visa",
    "cardholderName": "Jane Smith",
    "cardNumber": "4111111111111111",
    "expiry": "12/28",
}


class CreatePaymentMethodTestCase(ApiAcceptanceTestCase):
    def test_customer_can_create_payment_method(self) -> None:
        self.given_logged_in_customer()
        r = self.http.post("/api/payment-methods", VALID_METHOD)
        self.assertEqual(r.status, 201)
        body = r.body
        assert isinstance(body, dict)
        self.assertEqual(body["cardLast4"], "1111")
        self.assertEqual(body["type"], "Visa")
        self.assertEqual(body["cardholderName"], "Jane Smith")
        self.assertEqual(body["expiry"], "12/28")
        self.assertIn("id", body)

    def test_create_stores_only_last_four_digits(self) -> None:
        self.given_logged_in_customer()
        r = self.http.post(
            "/api/payment-methods",
            {**VALID_METHOD, "cardNumber": "4111111111119999"},
        )
        self.assertEqual(r.status, 201)
        body = r.body
        assert isinstance(body, dict)
        self.assertEqual(body["cardLast4"], "9999")

    def test_invalid_type_returns_422(self) -> None:
        self.given_logged_in_customer()
        r = self.http.post("/api/payment-methods", {**VALID_METHOD, "type": "Amex"})
        self.assertEqual(r.status, 400)

    def test_invalid_card_number_returns_422(self) -> None:
        self.given_logged_in_customer()
        r = self.http.post(
            "/api/payment-methods", {**VALID_METHOD, "cardNumber": "123"}
        )
        self.assertEqual(r.status, 400)

    def test_invalid_expiry_returns_422(self) -> None:
        self.given_logged_in_customer()
        r = self.http.post("/api/payment-methods", {**VALID_METHOD, "expiry": "1228"})
        self.assertEqual(r.status, 400)

    def test_unauthenticated_request_returns_401(self) -> None:
        r = self.http.post("/api/payment-methods", VALID_METHOD)
        self.assertEqual(r.status, 401)

    def test_staff_account_returns_403(self) -> None:
        staff = create_staff(
            self.fixture.user_repository,
            email="pm.staff@example.com",
            password="StaffPass9$",
        )
        self.auth.login_staff(email=staff.email, password=staff.password)
        r = self.http.post("/api/payment-methods", VALID_METHOD)
        self.assertEqual(r.status, 403)


class ListPaymentMethodsTestCase(ApiAcceptanceTestCase):
    def test_customer_can_list_their_methods(self) -> None:
        self.given_logged_in_customer()
        self.http.post("/api/payment-methods", VALID_METHOD)
        r = self.http.get("/api/payment-methods")
        self.assertEqual(r.status, 200)
        body = r.body
        assert isinstance(body, list)
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["cardLast4"], "1111")

    def test_customer_only_sees_own_methods(self) -> None:
        # Customer A adds a method
        self.given_logged_in_customer(email="cust.a@example.com")
        self.http.post("/api/payment-methods", VALID_METHOD)
        self.auth.logout()

        # Customer B should see an empty list
        self.given_logged_in_customer(email="cust.b@example.com")
        r = self.http.get("/api/payment-methods")
        self.assertEqual(r.status, 200)
        assert isinstance(r.body, list)
        self.assertEqual(len(r.body), 0)

    def test_unauthenticated_request_returns_401(self) -> None:
        r = self.http.get("/api/payment-methods")
        self.assertEqual(r.status, 401)


class UpdatePaymentMethodTestCase(ApiAcceptanceTestCase):
    def _create_method(self) -> str:
        r = self.http.post("/api/payment-methods", VALID_METHOD)
        assert r.status == 201
        body = r.body
        assert isinstance(body, dict)
        return str(body["id"])

    def test_customer_can_update_their_method(self) -> None:
        self.given_logged_in_customer()
        method_id = self._create_method()
        r = self.http.request(
            "PATCH",
            f"/api/payment-methods/{method_id}",
            {**VALID_METHOD, "cardNumber": "4111111111119876", "expiry": "06/30"},
        )
        self.assertEqual(r.status, 200)
        body = r.body
        assert isinstance(body, dict)
        self.assertEqual(body["cardLast4"], "9876")
        self.assertEqual(body["expiry"], "06/30")

    def test_invalid_update_returns_422(self) -> None:
        self.given_logged_in_customer()
        method_id = self._create_method()
        r = self.http.request(
            "PATCH",
            f"/api/payment-methods/{method_id}",
            {**VALID_METHOD, "type": "Discover"},
        )
        self.assertEqual(r.status, 400)


class DeletePaymentMethodTestCase(ApiAcceptanceTestCase):
    def test_customer_can_delete_their_method(self) -> None:
        self.given_logged_in_customer()
        r = self.http.post("/api/payment-methods", VALID_METHOD)
        body = r.body
        assert isinstance(body, dict)
        method_id = body["id"]

        del_r = self.http.request("DELETE", f"/api/payment-methods/{method_id}")
        self.assertEqual(del_r.status, 204)

        list_r = self.http.get("/api/payment-methods")
        assert isinstance(list_r.body, list)
        self.assertEqual(len(list_r.body), 0)

    def test_unauthenticated_delete_returns_401(self) -> None:
        r = self.http.request("DELETE", "/api/payment-methods/nonexistent-id")
        self.assertEqual(r.status, 401)
