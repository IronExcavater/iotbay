from e2e.support.browser import WEB_URL, SeleniumE2ETestCase


class SignInPage:
    def __init__(self, case: SeleniumE2ETestCase) -> None:
        self.case = case

    def open(self) -> None:
        self.case.driver.get(f"{WEB_URL}/sign-in")
        self.case.wait_for_text("Sign in")

    def submit_customer_credentials(self, *, email: str, password: str) -> None:
        email_input = self.case.driver.find_element(
            "css selector",
            "input[type='email']",
        )
        password_input = self.case.driver.find_element(
            "css selector",
            "input[name='password']",
        )
        email_input.clear()
        email_input.send_keys(email)
        password_input.clear()
        password_input.send_keys(password)
        self.case.driver.find_element(
            "css selector",
            "form button[type='submit']",
        ).click()
