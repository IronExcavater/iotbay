from src.common.pydantic import ApiRequestModel


class AddressQuery(ApiRequestModel):
    country: str = ""
    language: str = ""


class AddressSuggestQuery(AddressQuery):
    q: str = ""


class AddressResolveQuery(AddressQuery):
    id: str = ""
