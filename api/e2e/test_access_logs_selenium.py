from e2e.flows.auth import SignInFlow
from e2e.pages.access_logs import AccessLogsPage
from e2e.support.browser import SeleniumE2ETestCase


class AccessLogsSeleniumAcceptanceTestCase(SeleniumE2ETestCase):
    def test_user_can_view_their_access_logs_after_login(self) -> None:
        """AC: registered users can see their own stored access logs."""
        customer = self.create_customer()

        SignInFlow(self).sign_in(email=customer.email, password=customer.password)
        page = AccessLogsPage(self)
        page.open_account_security()

        self.wait_for_text("login")
        self.wait_for_text("Chrome")

    def test_user_can_search_access_logs_by_date_and_event_text(self) -> None:
        """AC: registered users can search log records by date."""
        customer = self.create_customer()

        SignInFlow(self).sign_in(email=customer.email, password=customer.password)
        page = AccessLogsPage(self)
        page.open_account_security()
        page.filter_after_today()
        page.search_logs("login")

        self.wait_for_text("login")
        self.assertFalse(page.has_text("No access logs found."))

    def test_access_logs_screen_does_not_offer_update_or_delete_actions(self) -> None:
        """AC: registered users cannot update or delete access logs in the UI."""
        customer = self.create_customer()

        SignInFlow(self).sign_in(email=customer.email, password=customer.password)
        page = AccessLogsPage(self)
        page.open_account_security()

        self.assertFalse(page.has_text("Delete log"))
        self.assertFalse(page.has_text("Edit log"))
