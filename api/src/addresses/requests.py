from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class AddressQuery(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    country: str = ""
    language: str = ""


class AddressSuggestQuery(AddressQuery):
    q: str = ""


class AddressResolveQuery(AddressQuery):
    id: str = ""
