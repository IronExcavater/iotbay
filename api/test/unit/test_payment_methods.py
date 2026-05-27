import unittest

from pydantic import ValidationError
from src.payment_methods.requests import PaymentMethodRequest

VALID_REQUEST: dict[str, object] = {
    "type": "Visa",
    "cardholderName": "Jane Smith",
    "cardNumber": "4111111111111111",
    "expiry": "12/28",
}


class PaymentMethodRequestValidationTestCase(unittest.TestCase):
    def test_valid_visa_request_passes(self) -> None:
        req = PaymentMethodRequest(**VALID_REQUEST)  # type: ignore[arg-type]
        self.assertEqual(req.type, "Visa")
        self.assertEqual(req.cardholder_name, "Jane Smith")
        self.assertEqual(req.card_number, "4111111111111111")
        self.assertEqual(req.expiry, "12/28")

    def test_valid_mastercard_request_passes(self) -> None:
        req = PaymentMethodRequest(
            type="Mastercard",
            cardholderName="Bob Jones",
            cardNumber="5500005555555559",
            expiry="06/27",
        )
        self.assertEqual(req.type, "Mastercard")

    def test_card_number_strips_spaces(self) -> None:
        req = PaymentMethodRequest(
            type="Visa",
            cardholderName="Alice",
            cardNumber="4111 1111 1111 1111",
            expiry="01/30",
        )
        self.assertEqual(req.card_number, "4111111111111111")

    def test_card_number_strips_dashes(self) -> None:
        req = PaymentMethodRequest(
            type="Visa",
            cardholderName="Alice",
            cardNumber="4111-1111-1111-1111",
            expiry="01/30",
        )
        self.assertEqual(req.card_number, "4111111111111111")

    def test_cardholder_name_strips_whitespace(self) -> None:
        req = PaymentMethodRequest(
            type="Visa",
            cardholderName="  Alice  ",
            cardNumber="4111111111111111",
            expiry="01/30",
        )
        self.assertEqual(req.cardholder_name, "Alice")

    def test_invalid_type_raises(self) -> None:
        with self.assertRaises(ValidationError):
            PaymentMethodRequest(
                type="Amex",
                cardholderName="Alice",
                cardNumber="4111111111111111",
                expiry="01/30",
            )

    def test_blank_cardholder_name_raises(self) -> None:
        with self.assertRaises(ValidationError):
            PaymentMethodRequest(
                type="Visa",
                cardholderName="   ",
                cardNumber="4111111111111111",
                expiry="01/30",
            )

    def test_card_number_too_short_raises(self) -> None:
        with self.assertRaises(ValidationError):
            PaymentMethodRequest(
                type="Visa",
                cardholderName="Alice",
                cardNumber="123456789012",
                expiry="01/30",
            )

    def test_non_digit_card_number_raises(self) -> None:
        with self.assertRaises(ValidationError):
            PaymentMethodRequest(
                type="Visa",
                cardholderName="Alice",
                cardNumber="abcd1234abcd1234",
                expiry="01/30",
            )

    def test_expiry_wrong_format_raises(self) -> None:
        with self.assertRaises(ValidationError):
            PaymentMethodRequest(
                type="Visa",
                cardholderName="Alice",
                cardNumber="4111111111111111",
                expiry="1228",
            )

    def test_expiry_invalid_month_raises(self) -> None:
        with self.assertRaises(ValidationError):
            PaymentMethodRequest(
                type="Visa",
                cardholderName="Alice",
                cardNumber="4111111111111111",
                expiry="13/28",
            )

    def test_expiry_zero_month_raises(self) -> None:
        with self.assertRaises(ValidationError):
            PaymentMethodRequest(
                type="Visa",
                cardholderName="Alice",
                cardNumber="4111111111111111",
                expiry="00/28",
            )
