import json
import ssl
from collections.abc import Mapping
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

import certifi
from src.addresses.models import AddressSuggestion, ValidatedAddress
from src.common.web import ApiError
from src.config import AddressConfig

_GOOGLE_ADDRESS_VALIDATION_URL = (
    "https://addressvalidation.googleapis.com/v1:validateAddress"
)
_GOOGLE_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"
_GOOGLE_PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places"


class AddressServiceUnavailableError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "address lookup is unavailable",
            503,
            code="ADDRESS_LOOKUP_UNAVAILABLE",
        )


class InvalidAddressSelectionError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "selected address is invalid",
            400,
            code="ADDRESS_INVALID",
        )


@dataclass(slots=True, frozen=True)
class GoogleAddressComponents:
    values: dict[str, dict[str, str]]

    @classmethod
    def from_payload(cls, payload: object) -> "GoogleAddressComponents":
        values: dict[str, dict[str, str]] = {}
        if isinstance(payload, list):
            for item in payload:
                if not isinstance(item, dict):
                    continue
                raw_types = item.get("types")
                if not isinstance(raw_types, list):
                    continue
                component_types = [
                    value for value in raw_types if isinstance(value, str)
                ]
                if not component_types:
                    continue
                raw_long_text = item.get("longText")
                long_text = raw_long_text if isinstance(raw_long_text, str) else ""
                raw_short_text = item.get("shortText")
                short_text = raw_short_text if isinstance(raw_short_text, str) else ""
                component_value: dict[str, str] = {
                    "longText": long_text,
                    "shortText": short_text,
                }
                for component_type in component_types:
                    values[component_type] = component_value
        return cls(values=values)

    def value(self, component_type: str, field_name: str) -> str:
        return self.values.get(component_type, {}).get(field_name, "")

    @property
    def street_address(self) -> str:
        return " ".join(
            part
            for part in (
                self.value("street_number", "longText"),
                self.value("route", "longText"),
            )
            if part
        )

    @property
    def suburb(self) -> str:
        return (
            self.value("locality", "longText")
            or self.value("postal_town", "longText")
            or self.value("sublocality", "longText")
            or self.value("administrative_area_level_2", "longText")
        )

    @property
    def state(self) -> str:
        return self.value("administrative_area_level_1", "shortText") or self.value(
            "administrative_area_level_1",
            "longText",
        )

    @property
    def postcode(self) -> str:
        return self.value("postal_code", "longText")

    @property
    def country(self) -> str:
        return self.value("country", "longText")


@dataclass(slots=True, frozen=True)
class GoogleMapsApi:
    config: AddressConfig

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    @property
    def api_key(self) -> str:
        return self.config.google_maps_api_key.strip()

    def suggest_addresses(
        self,
        *,
        query: str,
        country: str | None = None,
        language: str | None = None,
    ) -> list[AddressSuggestion]:
        payload = self._request_json(
            _GOOGLE_AUTOCOMPLETE_URL,
            body=self._compact(
                {
                    "input": query,
                    "languageCode": self._clean_language(language),
                    "regionCode": self._clean_country(country),
                }
            ),
            field_mask=(
                "suggestions.placePrediction.placeId,"
                "suggestions.placePrediction.text.text,"
                "suggestions.placePrediction.structuredFormat.secondaryText.text"
            ),
            method="POST",
            use_google_headers=True,
        )

        suggestions: list[AddressSuggestion] = []
        raw_items = payload.get("suggestions")
        if not isinstance(raw_items, list):
            return suggestions

        for item in raw_items:
            if not isinstance(item, dict):
                continue
            prediction = item.get("placePrediction")
            if not isinstance(prediction, dict):
                continue
            place_id = prediction.get("placeId")
            if not isinstance(place_id, str) or not place_id:
                continue
            label = prediction.get("text")
            label_text = label.get("text") if isinstance(label, dict) else ""
            if not isinstance(label_text, str) or not label_text:
                continue
            structured = prediction.get("structuredFormat")
            secondary = (
                structured.get("secondaryText")
                if isinstance(structured, dict)
                else None
            )
            subtitle = secondary.get("text") if isinstance(secondary, dict) else ""
            suggestions.append(
                AddressSuggestion(
                    id=place_id,
                    label=label_text,
                    subtitle=subtitle if isinstance(subtitle, str) else "",
                )
            )

        return suggestions

    def resolve_address(
        self,
        *,
        place_id: str,
        country: str | None = None,
        language: str | None = None,
    ) -> ValidatedAddress:
        payload = self._request_json(
            f"{_GOOGLE_PLACE_DETAILS_URL}/{quote(place_id)}",
            field_mask="id,formattedAddress,addressComponents,location",
            query=self._compact(
                {
                    "languageCode": self._clean_language(language),
                    "regionCode": self._clean_country(country),
                }
            ),
            use_google_headers=True,
        )

        formatted_address = payload.get("formattedAddress")
        if not isinstance(formatted_address, str) or not formatted_address:
            raise InvalidAddressSelectionError()

        components = GoogleAddressComponents.from_payload(
            payload.get("addressComponents")
        )
        location = payload.get("location")
        location_latitude = (
            location.get("latitude") if isinstance(location, dict) else None
        )
        location_longitude = (
            location.get("longitude") if isinstance(location, dict) else None
        )
        latitude = (
            float(location_latitude)
            if isinstance(location_latitude, (int, float))
            else None
        )
        longitude = (
            float(location_longitude)
            if isinstance(location_longitude, (int, float))
            else None
        )
        resolved_place_id = payload.get("id")

        return self._require_complete_address(
            ValidatedAddress(
                provider="google",
                place_id=(
                    resolved_place_id
                    if isinstance(resolved_place_id, str) and resolved_place_id
                    else place_id
                ),
                formatted_address=formatted_address,
                address_line_one=components.street_address,
                suburb=components.suburb,
                state=components.state,
                postcode=components.postcode,
                country=components.country,
                latitude=latitude,
                longitude=longitude,
            )
        )

    def validate_address(
        self,
        *,
        address_line_one: str,
        address_line_two: str = "",
        suburb: str,
        state: str,
        postcode: str,
        country: str,
        language: str | None = None,
    ) -> ValidatedAddress:
        payload = self._request_json(
            _GOOGLE_ADDRESS_VALIDATION_URL,
            body={
                "address": self._compact(
                    {
                        "addressLines": self._address_lines(
                            address_line_one=address_line_one,
                            address_line_two=address_line_two,
                            suburb=suburb,
                            state=state,
                            postcode=postcode,
                            country=country,
                        ),
                        "languageCode": self._clean_language(language),
                    }
                )
            },
            query={"key": self.api_key},
            use_google_headers=False,
        )

        result = payload.get("result")
        address = result.get("address") if isinstance(result, dict) else None
        postal_address = (
            address.get("postalAddress") if isinstance(address, dict) else None
        )
        formatted_address = (
            address.get("formattedAddress") if isinstance(address, dict) else None
        )
        if not isinstance(postal_address, dict) or not isinstance(
            formatted_address,
            str,
        ):
            raise InvalidAddressSelectionError()

        address_lines = postal_address.get("addressLines")
        first_line = (
            address_lines[0]
            if isinstance(address_lines, list)
            and address_lines
            and isinstance(address_lines[0], str)
            else ""
        )
        raw_locality = postal_address.get("locality")
        locality: str = raw_locality if isinstance(raw_locality, str) else ""
        raw_administrative_area = postal_address.get("administrativeArea")
        administrative_area: str = (
            raw_administrative_area if isinstance(raw_administrative_area, str) else ""
        )
        raw_postal_code = postal_address.get("postalCode")
        postal_code: str = raw_postal_code if isinstance(raw_postal_code, str) else ""
        region_code = postal_address.get("regionCode")
        country_name = country.strip() or (
            region_code.strip().upper() if isinstance(region_code, str) else ""
        )

        return self._require_complete_address(
            ValidatedAddress(
                provider="google",
                place_id="",
                formatted_address=formatted_address,
                address_line_one=first_line,
                suburb=locality,
                state=administrative_area,
                postcode=postal_code,
                country=country_name,
            )
        )

    def _require_complete_address(
        self,
        address: ValidatedAddress,
    ) -> ValidatedAddress:
        if not all(
            (
                address.address_line_one,
                address.suburb,
                address.state,
                address.postcode,
                address.country,
            )
        ):
            raise InvalidAddressSelectionError()
        return address

    def _request_json(
        self,
        url: str,
        *,
        body: Mapping[str, object] | None = None,
        field_mask: str | None = None,
        method: str = "GET",
        query: Mapping[str, str] | None = None,
        use_google_headers: bool,
    ) -> dict[str, object]:
        resolved_query = urlencode(query) if query else ""
        resolved_url = f"{url}?{resolved_query}" if resolved_query else url
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if use_google_headers:
            headers["X-Goog-Api-Key"] = self.api_key
        if field_mask is not None:
            headers["X-Goog-FieldMask"] = field_mask

        request = Request(
            resolved_url,
            data=(json.dumps(body).encode("utf-8") if body is not None else None),
            headers=headers,
            method=method,
        )

        try:
            with urlopen(request, context=self._ssl_context()) as response:
                payload = json.load(response)
        except (HTTPError, URLError, json.JSONDecodeError) as error:
            raise AddressServiceUnavailableError() from error

        if not isinstance(payload, dict):
            raise AddressServiceUnavailableError()
        return payload

    def _ssl_context(self) -> ssl.SSLContext:
        return ssl.create_default_context(cafile=certifi.where())

    def _clean_country(self, country: str | None) -> str | None:
        resolved = (country or "").strip().upper()
        if len(resolved) == 2 and resolved.isalpha():
            return resolved
        return None

    def _clean_language(self, language: str | None) -> str | None:
        resolved = (language or "").strip()
        if not resolved:
            return None

        parts = resolved.split("-")
        if not 1 <= len(parts) <= 3:
            return None
        if not (2 <= len(parts[0]) <= 3 and parts[0].isalpha()):
            return None
        if any(not part.isalnum() or not 2 <= len(part) <= 8 for part in parts[1:]):
            return None
        return resolved

    def _compact[TValue](
        self,
        value: Mapping[str, TValue | None],
    ) -> dict[str, TValue]:
        return {
            key: item for key, item in value.items() if item is not None and item != ""
        }

    def _address_lines(
        self,
        *,
        address_line_one: str,
        address_line_two: str,
        suburb: str,
        state: str,
        postcode: str,
        country: str,
    ) -> list[str]:
        locality = " ".join(
            part
            for part in (
                suburb.strip(),
                state.strip(),
                postcode.strip(),
            )
            if part
        )
        return [
            value
            for value in (
                address_line_one.strip(),
                address_line_two.strip(),
                locality,
                country.strip(),
            )
            if value
        ]
