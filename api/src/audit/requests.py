from typing import Annotated

from pydantic import AfterValidator
from src.audit.models import ENTITY_TYPE_USER
from src.common.pydantic import ApiRequestModel
from src.common.validation import ChoiceValidator, DateValidator, StringValidator

AUDIT_ACTION_VALIDATOR = StringValidator(
    field_name="action",
    max_length=80,
    ascii_only=True,
    printable_ascii_only=True,
)
AUDIT_ENTITY_TYPE_VALIDATOR = ChoiceValidator(
    field_name="entityType",
    choices=(ENTITY_TYPE_USER,),
)
DATE_VALIDATOR = DateValidator(field_name="date")


def _optional_action(value: str) -> str:
    return value if not value else AUDIT_ACTION_VALIDATOR.validate_request(value)


def _optional_entity_type(value: str) -> str:
    return value if not value else AUDIT_ENTITY_TYPE_VALIDATOR.validate_request(value)


def _optional_date(value: str) -> str:
    return value if not value else DATE_VALIDATOR.validate_request(value)


class AuditEventQuery(ApiRequestModel):
    action: Annotated[str, AfterValidator(_optional_action)] = ""
    entity_type: Annotated[str, AfterValidator(_optional_entity_type)] = ""
    from_date: Annotated[str, AfterValidator(_optional_date)] = ""
    to_date: Annotated[str, AfterValidator(_optional_date)] = ""
