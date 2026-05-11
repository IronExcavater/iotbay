from src.common.clock import UtcTime
from src.common.repository import Repository
from src.common.sqlite_model import id_bytes_to_string, new_id_bytes
from src.payment_methods.queries import (
    DELETE_PAYMENT_METHOD,
    INSERT_PAYMENT_METHOD,
    LIST_PAYMENT_METHODS,
    UPDATE_PAYMENT_METHOD,
)


class PaymentMethodRepository(Repository):
    def list_payment_methods(self, customer_id: bytes):
        with self.connect() as connection:
            rows = connection.execute(
                LIST_PAYMENT_METHODS,
                (customer_id,),
            ).fetchall()

            result = []

            for row in rows:
                result.append(
                    {
                        "id": id_bytes_to_string(row["payment_method_id"]),
                        "type": row["type"],
                        "cardholderName": row["cardholder_name"],
                        "cardLast4": row["card_last4"],
                        "expiry": row["expiry"],
                        "createdAt": row["created_at"],
                    }
                )

            return result

    def insert_payment_method(
        self,
        customer_id: bytes,
        type: str,
        cardholder_name: str,
        card_last4: str,
        expiry: str,
    ):
        payment_method_id = new_id_bytes()
        created_at = UtcTime.now().iso

        with self.connect() as connection:
            connection.execute(
                INSERT_PAYMENT_METHOD,
                (
                    payment_method_id,
                    customer_id,
                    type,
                    cardholder_name,
                    card_last4,
                    expiry,
                    created_at,
                ),
            )

        return {
            "id": id_bytes_to_string(payment_method_id),
            "type": type,
            "cardholderName": cardholder_name,
            "cardLast4": card_last4,
            "expiry": expiry,
            "createdAt": created_at,
        }

    def update_payment_method(
        self,
        payment_method_id: bytes,
        customer_id: bytes,
        type: str,
        cardholder_name: str,
        card_last4: str,
        expiry: str,
    ):
        with self.connect() as connection:
            connection.execute(
                UPDATE_PAYMENT_METHOD,
                (
                    type,
                    cardholder_name,
                    card_last4,
                    expiry,
                    payment_method_id,
                    customer_id,
                ),
            )

        return {
            "id": id_bytes_to_string(payment_method_id),
            "type": type,
            "cardholderName": cardholder_name,
            "cardLast4": card_last4,
            "expiry": expiry,
        }

    def delete_payment_method(self, payment_method_id: bytes, customer_id: bytes):
        with self.connect() as connection:
            connection.execute(
                DELETE_PAYMENT_METHOD,
                (payment_method_id, customer_id),
            )
