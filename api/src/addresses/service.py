from dataclasses import dataclass

from src.addresses.google_maps_api import (
    AddressServiceUnavailableError,
    GoogleMapsApi,
)
from src.addresses.models import (
    AddressSuggestion,
    ValidatedAddress,
    manual_validated_address,
)


@dataclass(slots=True, frozen=True)
class AddressService:
    google_maps_api: GoogleMapsApi

    @property
    def is_configured(self) -> bool:
        return self.google_maps_api.is_configured

    def suggest(
        self,
        *,
        query: str,
        country: str | None = None,
        language: str | None = None,
    ) -> list[AddressSuggestion]:
        self._require_configuration()
        return self.google_maps_api.suggest_addresses(
            query=query,
            country=country,
            language=language,
        )

    def resolve(
        self,
        *,
        place_id: str,
        country: str | None = None,
        language: str | None = None,
    ) -> ValidatedAddress:
        self._require_configuration()
        return self.google_maps_api.resolve_address(
            place_id=place_id,
            country=country,
            language=language,
        )

    def validate(
        self,
        *,
        address_line_one: str,
        address_line_two: str = "",
        suburb: str,
        state: str,
        postcode: str,
        country: str,
        language: str | None = None,
    ) -> ValidatedAddress | None:
        if not any(
            (
                address_line_one.strip(),
                suburb.strip(),
                state.strip(),
                postcode.strip(),
                country.strip(),
            )
        ):
            return None

        try:
            return self._validate_with_provider(
                address_line_one=address_line_one,
                address_line_two=address_line_two,
                suburb=suburb,
                state=state,
                postcode=postcode,
                country=country,
                language=language,
            )
        except AddressServiceUnavailableError:
            return manual_validated_address(
                address_line_one=address_line_one,
                suburb=suburb,
                state=state,
                postcode=postcode,
                country=country,
            )

    def _validate_with_provider(
        self,
        *,
        address_line_one: str,
        address_line_two: str,
        suburb: str,
        state: str,
        postcode: str,
        country: str,
        language: str | None,
    ) -> ValidatedAddress:
        self._require_configuration()
        return self.google_maps_api.validate_address(
            address_line_one=address_line_one,
            address_line_two=address_line_two,
            suburb=suburb,
            state=state,
            postcode=postcode,
            country=country,
            language=language,
        )

    def _require_configuration(self) -> None:
        if not self.is_configured:
            raise AddressServiceUnavailableError()
