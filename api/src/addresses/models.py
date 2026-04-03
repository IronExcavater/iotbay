from dataclasses import dataclass, field

from pydantic import BaseModel
from src.common.sqlite_model import (
    ApiModel,
    BlobUuidModel,
    SqliteRowModel,
    new_id_bytes,
)
from src.common.validation import ADDRESS_MAX_LENGTH, AddressValidator

ADDRESS_LINE_ONE_VALIDATOR = AddressValidator(
    field_name="addressLineOne",
    max_length=ADDRESS_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)
ADDRESS_LINE_TWO_VALIDATOR = AddressValidator(
    field_name="addressLineTwo",
    max_length=ADDRESS_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)
SUBURB_VALIDATOR = AddressValidator(
    field_name="suburb",
    max_length=ADDRESS_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)
STATE_VALIDATOR = AddressValidator(
    field_name="state",
    max_length=ADDRESS_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)
POSTCODE_VALIDATOR = AddressValidator(
    field_name="postcode",
    max_length=ADDRESS_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)
COUNTRY_VALIDATOR = AddressValidator(
    field_name="country",
    max_length=ADDRESS_MAX_LENGTH,
    ascii_only=True,
    printable_ascii_only=True,
)


@dataclass(slots=True, frozen=True)
class AddressSuggestion(ApiModel):
    public_fields = ("id", "label", "subtitle")

    id: str
    label: str
    subtitle: str


@dataclass(slots=True, frozen=True)
class Address(SqliteRowModel, BlobUuidModel):
    provider: str
    provider_address_id: str
    formatted_address: str
    address_line_one: str
    address_line_two: str
    suburb: str
    state: str
    postcode: str
    country: str
    latitude: float | None = None
    longitude: float | None = None
    address_id: bytes = field(default_factory=new_id_bytes)


@dataclass(slots=True, frozen=True)
class ValidatedAddress(ApiModel):
    public_fields = (
        "address_line_one",
        "country",
        "formatted_address",
        "latitude",
        "longitude",
        "place_id",
        "postcode",
        "provider",
        "state",
        "suburb",
    )

    address_line_one: str
    country: str
    formatted_address: str
    place_id: str
    postcode: str
    provider: str
    state: str
    suburb: str
    latitude: float | None = None
    longitude: float | None = None


def manual_validated_address(
    *,
    address_line_one: str,
    suburb: str,
    state: str,
    postcode: str,
    country: str,
) -> ValidatedAddress:
    line_one = address_line_one.strip()
    suburb_name = suburb.strip()
    state_name = state.strip()
    post_code = postcode.strip()
    country_name = country.strip()
    locality = " ".join(part for part in (suburb_name, state_name, post_code) if part)

    return ValidatedAddress(
        provider="manual",
        place_id="",
        formatted_address=", ".join(
            part for part in (line_one, locality, country_name) if part
        ),
        address_line_one=line_one,
        suburb=suburb_name,
        state=state_name,
        postcode=post_code,
        country=country_name,
    )


def validate_address_fields[TValidatedModel: BaseModel](
    values: TValidatedModel,
    *,
    required: bool = False,
) -> TValidatedModel:
    address_line_one = getattr(values, "address_line_one", "")
    address_line_two = getattr(values, "address_line_two", "")
    suburb = getattr(values, "suburb", "")
    state = getattr(values, "state", "")
    postcode = getattr(values, "postcode", "")
    country = getattr(values, "country", "")
    manual_address_fields = (
        address_line_one,
        suburb,
        state,
        postcode,
        country,
    )

    if not any((address_line_two, *manual_address_fields)):
        if required:
            raise ValueError(
                "addressLineOne, suburb, state, postcode and country are required"
            )
        return values

    if not all(field.strip() for field in manual_address_fields):
        raise ValueError(
            "addressLineOne, suburb, state, postcode and country are "
            "required when address is provided"
        )

    return values
