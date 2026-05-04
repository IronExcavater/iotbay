from dataclasses import dataclass
from pathlib import Path
from string import Template

from src.common.date_time import format_datetime

EMAIL_STYLESHEET = Path(__file__).with_name("styles.css").read_text(encoding="utf-8")


@dataclass(slots=True, frozen=True)
class RenderedEmail:
    html_body: str
    subject: str
    text_body: str
    to_email: str


PASSWORD_RESET_HTML_TEMPLATE = Template(
    Path(__file__).with_name("password_reset.html").read_text(encoding="utf-8")
)
REGISTRATION_VERIFICATION_HTML_TEMPLATE = Template(
    Path(__file__)
    .with_name("registration_verification.html")
    .read_text(encoding="utf-8")
)
STAFF_INVITATION_HTML_TEMPLATE = Template(
    Path(__file__).with_name("staff_invitation.html").read_text(encoding="utf-8")
)
LOGIN_MFA_CODE_HTML_TEMPLATE = Template(
    Path(__file__).with_name("login_mfa_code.html").read_text(encoding="utf-8")
)


def render_password_reset_email(
    *,
    email: str,
    reset_url: str,
    expires_at: str,
    locale: str,
) -> RenderedEmail:
    subject = "Reset your IoTBay password"
    formatted_expires_at = _format_expiry(expires_at, locale=locale)
    template_data = {
        "email": email,
        "formatted_expires_at": formatted_expires_at,
        "inline_styles": EMAIL_STYLESHEET,
        "reset_url": reset_url,
    }
    return _render_email(
        html_template=PASSWORD_RESET_HTML_TEMPLATE,
        subject=subject,
        text_body=(
            "We received a request to reset the password for your IoTBay account.\n\n"
            "Reset your password: {reset_url}\n"
            "Expires: {formatted_expires_at}\n\n"
            "If you did not request this, you can ignore this email."
        ),
        to_email=email,
        template_data=template_data,
    )


def render_registration_verification_email(
    *,
    email: str,
    verification_url: str,
    expires_at: str,
    locale: str,
) -> RenderedEmail:
    subject = "Verify your IoTBay email"
    formatted_expires_at = _format_expiry(expires_at, locale=locale)
    template_data = {
        "email": email,
        "formatted_expires_at": formatted_expires_at,
        "inline_styles": EMAIL_STYLESHEET,
        "verification_url": verification_url,
    }
    return _render_email(
        html_template=REGISTRATION_VERIFICATION_HTML_TEMPLATE,
        subject=subject,
        text_body=(
            "Finish creating your IoTBay account by verifying your email address.\n\n"
            "Verify your email: {verification_url}\n"
            "Expires: {formatted_expires_at}\n\n"
            "If you did not start this signup, you can ignore this email."
        ),
        to_email=email,
        template_data=template_data,
    )


def render_staff_invitation_email(
    *,
    email: str,
    registration_url: str,
    expires_at: str,
    locale: str,
) -> RenderedEmail:
    subject = "Create your IoTBay staff account"
    formatted_expires_at = _format_expiry(expires_at, locale=locale)
    template_data = {
        "email": email,
        "formatted_expires_at": formatted_expires_at,
        "inline_styles": EMAIL_STYLESHEET,
        "registration_url": registration_url,
    }
    return _render_email(
        html_template=STAFF_INVITATION_HTML_TEMPLATE,
        subject=subject,
        text_body=(
            "You were invited to create an IoTBay staff account.\n\n"
            "Create your staff account: {registration_url}\n"
            "Expires: {formatted_expires_at}\n\n"
            "If you were not expecting this invitation, you can ignore this email."
        ),
        to_email=email,
        template_data=template_data,
    )


def render_login_mfa_code_email(
    *,
    code: str,
    email: str,
    expires_at: str,
    locale: str,
) -> RenderedEmail:
    subject = "Your IoTBay sign in code"
    formatted_expires_at = _format_expiry(expires_at, locale=locale)
    template_data = {
        "code": code,
        "email": email,
        "formatted_expires_at": formatted_expires_at,
        "inline_styles": EMAIL_STYLESHEET,
    }
    return _render_email(
        html_template=LOGIN_MFA_CODE_HTML_TEMPLATE,
        subject=subject,
        text_body=(
            "Use this code to finish signing in to your IoTBay account: {code}\n"
            "Expires: {formatted_expires_at}\n\n"
            "If you did not try to sign in, you can ignore this email."
        ),
        to_email=email,
        template_data=template_data,
    )


def _render_email(
    *,
    html_template: Template,
    subject: str,
    text_body: str,
    to_email: str,
    template_data: dict[str, str],
) -> RenderedEmail:
    return RenderedEmail(
        html_body=html_template.substitute(**template_data),
        subject=subject,
        text_body=text_body.format(**template_data).strip(),
        to_email=to_email,
    )


def _format_expiry(value: str, *, locale: str) -> str:
    formatted = format_datetime(value, display="relative", locale=locale)
    return formatted[:1].upper() + formatted[1:] if formatted else formatted
