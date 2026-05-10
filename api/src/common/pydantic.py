from typing import Any

from pydantic import ConfigDict
from pydantic.alias_generators import to_camel


def camel_case_config(**overrides: Any) -> ConfigDict:
    return ConfigDict(
        alias_generator=to_camel,
        validate_by_name=True,
        validate_by_alias=True,
        **overrides,
    )
