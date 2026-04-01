from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from textwrap import dedent


@dataclass(slots=True, frozen=True)
class RenderedEmail:
    html_body: str
    subject: str
    text_body: str
    to_email: str


EMAIL_STYLESHEET = (
    Path(__file__).with_name("styles.css").read_text(encoding="utf-8").strip()
)


def render_password_reset_email(
    *,
    email: str,
    reset_url: str,
    expires_at: str,
) -> RenderedEmail:
    subject = "Reset your IOTBay password"
    formatted_expires_at = _format_expiry(expires_at)
    text_body = dedent(
        f"""\
        We received a request to reset the password for your IOTBay account.

        Reset your password: {reset_url}
        Expires at: {formatted_expires_at}

        If you did not request this, you can ignore this email.
        """
    ).strip()
    return RenderedEmail(
        html_body=_render_document(
            dedent(
                f"""\
                <div class="shell">
                  <div class="card">
                    <div class="header">
                      <p class="brand">IOTBay</p>
                      <h1 class="title">Reset your password</h1>
                    </div>
                    <div class="content">
                      <p class="copy">
                        We received a request to reset the password for
                        <strong>{email}</strong>.
                      </p>
                      <div class="panel">
                        <p class="label">Password reset link</p>
                        <p class="muted">
                          <a href="{reset_url}">Reset your password</a>
                        </p>
                      </div>
                      <p class="muted">
                        This link expires at <strong>{formatted_expires_at}</strong>.
                      </p>
                      <p class="footer">
                        If you did not request this, you can ignore this email.
                      </p>
                    </div>
                  </div>
                </div>
                """
            ).strip()
        ),
        subject=subject,
        text_body=text_body,
        to_email=email,
    )


def render_registration_verification_email(
    *,
    email: str,
    verification_url: str,
    expires_at: str,
) -> RenderedEmail:
    subject = "Verify your IOTBay email"
    formatted_expires_at = _format_expiry(expires_at)
    text_body = dedent(
        f"""\
        Finish creating your IOTBay account by verifying your email address.

        Verify your email: {verification_url}
        Expires at: {formatted_expires_at}

        If you did not start this signup, you can ignore this email.
        """
    ).strip()
    return RenderedEmail(
        html_body=_render_document(
            dedent(
                f"""\
                <div class="shell">
                  <div class="card">
                    <div class="header">
                      <p class="brand">IOTBay</p>
                      <h1 class="title">Verify your email</h1>
                    </div>
                    <div class="content">
                      <p class="copy">
                        Finish creating your IOTBay account for
                        <strong>{email}</strong>.
                      </p>
                      <div class="panel">
                        <p class="label">Verification link</p>
                        <p class="muted">
                          <a href="{verification_url}">Verify your email</a>
                        </p>
                      </div>
                      <p class="muted">
                        This link expires at <strong>{formatted_expires_at}</strong>.
                      </p>
                      <p class="footer">
                        If you did not start this signup, you can ignore this email.
                      </p>
                    </div>
                  </div>
                </div>
                """
            ).strip()
        ),
        subject=subject,
        text_body=text_body,
        to_email=email,
    )


def _render_document(content: str) -> str:
    # Keep the email self-contained so fallback HTML opens cleanly in a browser.
    return dedent(
        f"""\
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <style>
        {EMAIL_STYLESHEET}
            </style>
          </head>
          <body>
        {content}
          </body>
        </html>
        """
    ).strip()


def _format_expiry(value: str) -> str:
    expiry = datetime.fromisoformat(value)
    if expiry.tzinfo is None:
        return expiry.strftime("%d %b %Y, %I:%M %p")

    utc_expiry = expiry.astimezone(UTC)
    return utc_expiry.strftime("%d %b %Y, %I:%M %p UTC")
