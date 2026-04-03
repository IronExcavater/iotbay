import sqlite3

from src.addresses.models import Address, ValidatedAddress
from src.common.repository import Repository
from src.common.text import stripped_or_none


class AddressRepository(Repository):
    def upsert_address(
        self,
        connection: sqlite3.Connection,
        *,
        address_id: bytes | None,
        validated_address: ValidatedAddress | None,
        address_line_two: str | None,
    ) -> bytes | None:
        if validated_address is None:
            return None

        values = {
            "provider": validated_address.provider,
            "provider_address_id": validated_address.place_id,
            "formatted_address": validated_address.formatted_address,
            "address_line_one": validated_address.address_line_one,
            "address_line_two": stripped_or_none(address_line_two) or "",
            "suburb": validated_address.suburb,
            "state": validated_address.state,
            "postcode": validated_address.postcode,
            "country": validated_address.country,
            "latitude": validated_address.latitude,
            "longitude": validated_address.longitude,
        }

        saved_address_id = address_id or Address(**values).address_id
        self.upsert_into(
            connection,
            "addresses",
            {"address_id": saved_address_id, **values},
            update_values=values,
            where="address_id = ?",
            where_parameters=(saved_address_id,),
        )
        return saved_address_id

    def delete_address(
        self,
        connection: sqlite3.Connection,
        *,
        address_id: bytes | None,
    ) -> None:
        if address_id is None:
            return

        self.delete_from(
            connection,
            "addresses",
            where="address_id = ?",
            where_parameters=(address_id,),
        )
