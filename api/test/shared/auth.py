import re

from werkzeug.test import TestResponse


def download_token(response: TestResponse) -> str:
    payload = response.get_json()
    assert payload is not None
    token_match = re.search(r"token=([^\"&]+)", payload["download"]["html"])
    assert token_match is not None
    return token_match.group(1)


def mfa_code(response: TestResponse) -> str:
    payload = response.get_json()
    assert payload is not None
    html = payload["download"]["html"]
    match = re.search(r">\s*(\d{6})\s*<", html)
    assert match is not None
    return match.group(1)
