import logging
import re
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from http import HTTPStatus
from typing import Protocol

from src.common.web import ApiError
from src.config import EmailConfig
from src.emails.templates import (
    RenderedEmail,
    render_password_reset_email,
    render_registration_verification_email,
)

LOGGER = logging.getLogger(__name__)


class EmailDeliveryError(ApiError):
    def __init__(self, message: str, *, code: str) -> None:
        super().__init__(message, HTTPStatus.SERVICE_UNAVAILABLE, code=code)


@dataclass(slots=True, frozen=True)
class DeliveredEmailArtifact:
    content: str | None
    filename: str | None
    location: str | None
    transport: str


class EmailTransport(Protocol):
    def deliver(self, rendered_email: RenderedEmail) -> DeliveredEmailArtifact: ...


class EmailService:
    def __init__(self, config: EmailConfig) -> None:
        self._transports = _build_email_transports(config)

    def send_password_reset_link(
        self,
        *,
        email: str,
        reset_url: str,
        expires_at: str,
        locale: str,
    ) -> DeliveredEmailArtifact:
        rendered_email = render_password_reset_email(
            email=email,
            reset_url=reset_url,
            expires_at=expires_at,
            locale=locale,
        )
        return self._deliver(rendered_email)

    def send_verification_link(
        self,
        *,
        email: str,
        verification_url: str,
        expires_at: str,
        locale: str,
    ) -> DeliveredEmailArtifact:
        rendered_email = render_registration_verification_email(
            email=email,
            verification_url=verification_url,
            expires_at=expires_at,
            locale=locale,
        )
        return self._deliver(rendered_email)

    def _deliver(self, rendered_email: RenderedEmail) -> DeliveredEmailArtifact:
        failures: list[EmailDeliveryError] = []
        for transport in self._transports:
            try:
                artifact = transport.deliver(rendered_email)
                _log_delivery_fallback(rendered_email, artifact, failures)
                return artifact
            except EmailDeliveryError as error:
                failures.append(error)

        if failures:
            raise failures[-1]

        raise EmailDeliveryError(
            "email delivery is not configured",
            code="EMAIL_NOT_CONFIGURED",
        )


class SmtpEmailTransport:
    def __init__(self, config: EmailConfig) -> None:
        self._config = config

    def is_configured(self) -> bool:
        config = self._config
        return bool(config.sender and config.smtp_host)

    def deliver(self, rendered_email: RenderedEmail) -> DeliveredEmailArtifact:
        config = self._require_config()
        message = _smtp_message(config, rendered_email)
        try:
            with smtplib.SMTP(
                config.smtp_host,
                config.smtp_port,
                timeout=15,
            ) as client:
                if config.smtp_use_tls:
                    client.starttls()
                if config.smtp_username:
                    client.login(config.smtp_username, config.smtp_password)
                client.send_message(message)
            return DeliveredEmailArtifact(
                content=None,
                filename=None,
                location=f"smtp://{config.smtp_host}:{config.smtp_port}",
                transport="smtp",
            )
        except smtplib.SMTPAuthenticationError as error:
            raise EmailDeliveryError(
                (
                    "SMTP authentication failed. Check IOTBAY_SMTP_USERNAME and "
                    "IOTBAY_SMTP_PASSWORD. Gmail requires an app password."
                ),
                code="SMTP_AUTH_FAILED",
            ) from error
        except (OSError, smtplib.SMTPException) as error:
            raise EmailDeliveryError(
                (
                    "SMTP delivery failed. Check IOTBAY_SMTP_HOST, "
                    "IOTBAY_SMTP_PORT, and IOTBAY_SMTP_USE_TLS."
                ),
                code="SMTP_UNAVAILABLE",
            ) from error

    def _require_config(self) -> EmailConfig:
        config = self._config
        if not config.sender:
            raise EmailDeliveryError(
                "IOTBAY_SENDER or IOTBAY_SMTP_USERNAME must be set in .env",
                code="SMTP_NOT_CONFIGURED",
            )

        if not config.smtp_host:
            raise EmailDeliveryError(
                "IOTBAY_SMTP_HOST must be set in .env",
                code="SMTP_NOT_CONFIGURED",
            )

        if bool(config.smtp_username) != bool(config.smtp_password):
            raise EmailDeliveryError(
                "IOTBAY_SMTP_USERNAME and IOTBAY_SMTP_PASSWORD must be set together",
                code="SMTP_INVALID_CONFIG",
            )

        return config


class BrowserDownloadEmailTransport:
    def deliver(self, rendered_email: RenderedEmail) -> DeliveredEmailArtifact:
        return DeliveredEmailArtifact(
            content=_download_content(rendered_email),
            filename=f"{_email_slug(rendered_email)}.html",
            location=None,
            transport="download",
        )


def _build_email_transports(config: EmailConfig) -> list[EmailTransport]:
    smtp_transport = SmtpEmailTransport(config)
    transports: list[EmailTransport] = [BrowserDownloadEmailTransport()]
    if smtp_transport.is_configured():
        transports.insert(0, smtp_transport)
    return transports


def _smtp_message(config: EmailConfig, rendered_email: RenderedEmail) -> EmailMessage:
    message = EmailMessage()
    message["From"] = config.sender
    message["To"] = rendered_email.to_email
    message["Subject"] = rendered_email.subject
    message.set_content(rendered_email.text_body)
    message.add_alternative(rendered_email.html_body, subtype="html")
    return message


def _download_content(rendered_email: RenderedEmail) -> str:
    metadata = [
        f"to: {rendered_email.to_email}",
        f"subject: {rendered_email.subject}",
        "transport: browser-download",
    ]
    metadata_comments = "\n".join(f"<!-- {line} -->" for line in metadata)
    return metadata_comments + "\n" + rendered_email.html_body


def _log_delivery_fallback(
    rendered_email: RenderedEmail,
    artifact: DeliveredEmailArtifact,
    failures: list[EmailDeliveryError],
) -> None:
    if not failures:
        return

    failure_codes = ", ".join(error.code or "EMAIL_ERROR" for error in failures)
    LOGGER.warning(
        "Email delivery fell back to %s for %s after %s",
        artifact.transport,
        rendered_email.to_email,
        failure_codes,
    )


def _email_slug(rendered_email: RenderedEmail) -> str:
    return _slugify(f"{rendered_email.to_email}-{rendered_email.subject}")


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "message"
