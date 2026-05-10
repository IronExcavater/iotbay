import unittest

from src.common.pydantic import ApiRequestModel


class ExampleRequest(ApiRequestModel):
    event_type: str


class PydanticAliasConfigTestCase(unittest.TestCase):
    def test_camel_case_config_accepts_alias_and_field_name(self) -> None:
        alias_request = ExampleRequest.model_validate({"eventType": " login "})
        field_name_request = ExampleRequest.model_validate({"event_type": " logout "})

        self.assertEqual(alias_request.event_type, "login")
        self.assertEqual(field_name_request.event_type, "logout")
        self.assertEqual(
            alias_request.model_dump(by_alias=True),
            {"eventType": "login"},
        )
