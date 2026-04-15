from dataclasses import dataclass
from typing import ClassVar

from src.common.validation import (
    EMAIL_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    ChoiceValidator,
    EmailValidator,
    MoneyValidator,
    NameValidator,
    PasswordValidator,
    StringValidator,
)

PRODUCT_CODE_MAX_LENGTH = 32
PRODUCT_NAME_MAX_LENGTH = 120
PRODUCT_MAX_PRICE_CENTS = 100_000_000
NAME_MAX_LENGTH = 100
STAFF_DESIGNATION_MAX_LENGTH = 100
STAFF_ID_MAX_LENGTH = 50


@dataclass(slots=True, frozen=True)
class EmailAddress:
    value: str

    VALIDATOR: ClassVar[EmailValidator] = EmailValidator(
        field_name="email",
        required=True,
        max_length=EMAIL_MAX_LENGTH,
        ascii_only=True,
        printable_ascii_only=True,
        lowercase=True,
    )

    @classmethod
    def validate_request(cls, value: str) -> str:
        return cls.VALIDATOR.validate_request(value)

    @classmethod
    def validate_domain(cls, value: str) -> str:
        return cls.VALIDATOR.validate_domain(value)


@dataclass(slots=True, frozen=True)
class FirstName:
    value: str

    VALIDATOR: ClassVar[NameValidator] = NameValidator(
        field_name="firstName",
        required=True,
        max_length=NAME_MAX_LENGTH,
        ascii_only=True,
        printable_ascii_only=True,
    )

    @classmethod
    def validate_request(cls, value: str) -> str:
        return cls.VALIDATOR.validate_request(value)

    @classmethod
    def validate_domain(cls, value: str) -> str:
        return cls.VALIDATOR.validate_domain(value)


@dataclass(slots=True, frozen=True)
class LastName:
    value: str

    VALIDATOR: ClassVar[NameValidator] = NameValidator(
        field_name="lastName",
        required=True,
        max_length=NAME_MAX_LENGTH,
        ascii_only=True,
        printable_ascii_only=True,
    )

    @classmethod
    def validate_request(cls, value: str) -> str:
        return cls.VALIDATOR.validate_request(value)

    @classmethod
    def validate_domain(cls, value: str) -> str:
        return cls.VALIDATOR.validate_domain(value)


@dataclass(slots=True, frozen=True)
class PasswordText:
    value: str

    INPUT_VALIDATOR: ClassVar[StringValidator] = StringValidator(
        field_name="password",
        required=True,
        max_length=PASSWORD_MAX_LENGTH,
        ascii_only=True,
        printable_ascii_only=True,
    )
    DOMAIN_VALIDATOR: ClassVar[PasswordValidator] = PasswordValidator(
        field_name="password",
        required=True,
        max_length=PASSWORD_MAX_LENGTH,
        ascii_only=True,
        printable_ascii_only=True,
    )


@dataclass(slots=True, frozen=True)
class ProductName:
    value: str

    VALIDATOR: ClassVar[StringValidator] = StringValidator(
        field_name="name",
        required=True,
        max_length=PRODUCT_NAME_MAX_LENGTH,
        ascii_only=True,
        printable_ascii_only=True,
        required_code="PRODUCT_NAME_REQUIRED",
        too_long_code="PRODUCT_NAME_TOO_LONG",
        invalid_code="PRODUCT_NAME_INVALID",
    )

    @classmethod
    def validate_request(cls, value: str) -> str:
        return cls.VALIDATOR.validate_request(value)

    @classmethod
    def validate_domain(cls, value: str) -> str:
        return cls.VALIDATOR.validate_domain(value)


@dataclass(slots=True, frozen=True)
class ProductCode:
    value: str

    VALIDATOR: ClassVar[StringValidator] = StringValidator(
        field_name="code",
        required=True,
        max_length=PRODUCT_CODE_MAX_LENGTH,
        ascii_only=True,
        printable_ascii_only=True,
        uppercase=True,
        required_code="PRODUCT_CODE_REQUIRED",
        too_long_code="PRODUCT_CODE_TOO_LONG",
        invalid_code="PRODUCT_CODE_INVALID",
    )

    @classmethod
    def validate_request(cls, value: str) -> str:
        return cls.VALIDATOR.validate_request(value)

    @classmethod
    def validate_domain(cls, value: str) -> str:
        return cls.VALIDATOR.validate_domain(value)


@dataclass(slots=True, frozen=True)
class MoneyAmount:
    cents: int

    VALIDATOR: ClassVar[MoneyValidator] = MoneyValidator(
        field_name="price",
        min_value=0,
        max_value=PRODUCT_MAX_PRICE_CENTS,
        too_small_code="PRODUCT_PRICE_INVALID",
        too_large_code="PRODUCT_PRICE_TOO_LARGE",
    )
    REQUEST_VALIDATOR: ClassVar[MoneyValidator] = MoneyValidator(
        field_name="priceCents",
        min_value=0,
        max_value=PRODUCT_MAX_PRICE_CENTS,
    )

    @classmethod
    def validate_request_cents(cls, value: int) -> int:
        return cls.REQUEST_VALIDATOR.validate_request(value)

    @classmethod
    def validate_domain_cents(cls, value: int) -> int:
        return cls.VALIDATOR.validate_domain(value)


@dataclass(slots=True, frozen=True)
class Designation:
    value: str

    VALIDATOR: ClassVar[StringValidator] = StringValidator(
        field_name="designation",
        max_length=STAFF_DESIGNATION_MAX_LENGTH,
        ascii_only=True,
        printable_ascii_only=True,
    )


@dataclass(slots=True, frozen=True)
class StaffId:
    value: str

    VALIDATOR: ClassVar[StringValidator] = StringValidator(
        field_name="staffId",
        max_length=STAFF_ID_MAX_LENGTH,
        ascii_only=True,
        printable_ascii_only=True,
        uppercase=True,
    )


@dataclass(slots=True, frozen=True)
class PermissionValue:
    value: str

    VALIDATOR: ClassVar[ChoiceValidator] = ChoiceValidator(
        field_name="permission",
        choices=("admin", "superadmin"),
    )
