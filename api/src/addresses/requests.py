from pydantic import BaseModel
from src.common.pydantic import camel_case_config


class AddressQuery(BaseModel):
    model_config = camel_case_config(
        str_strip_whitespace=True,
    )

    country: str = ""
    language: str = ""


class AddressSuggestQuery(AddressQuery):
    q: str = ""


class AddressResolveQuery(AddressQuery):
    id: str = ""
