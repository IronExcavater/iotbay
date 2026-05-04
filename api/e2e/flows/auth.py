from e2e.pages.sign_in import SignInPage
from e2e.support.browser import SeleniumE2ETestCase


class SignInFlow:
    def __init__(self, case: SeleniumE2ETestCase) -> None:
        self.case = case

    def sign_in(self, *, email: str, password: str) -> None:
        page = SignInPage(self.case)
        page.open()
        page.submit_customer_credentials(email=email, password=password)
        self.case.wait_for_text("Access Customer")
