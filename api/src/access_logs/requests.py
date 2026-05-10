from typing import Annotated

from pydantic import AfterValidator, BaseModel
from src.common.pydantic import camel_case_config
from src.common.validation import ChoiceValidator, DateValidator

ACCESS_EVENT_VALIDATOR = ChoiceValidator(
    field_name="eventType",
    choices=("login", "logout", "session_revoked"),
)
DATE_VALIDATOR = DateValidator(field_name="date")


def _optional_event(value: str) -> str:
    return value if not value else ACCESS_EVENT_VALIDATOR.validate_request(value)


def _optional_date(value: str) -> str:
    return value if not value else DATE_VALIDATOR.validate_request(value)


class AccessLogQuery(BaseModel):
    model_config = camel_case_config(
        str_strip_whitespace=True,
    )

    event_type: Annotated[str, AfterValidator(_optional_event)] = ""
    from_date: Annotated[str, AfterValidator(_optional_date)] = ""
    to_date: Annotated[str, AfterValidator(_optional_date)] = ""
