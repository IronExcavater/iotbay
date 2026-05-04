from flask import Flask
from src.access_logs.routes import access_logs_bp
from src.addresses.routes import addresses_bp
from src.app_services import build_app_services
from src.audit.routes import audit_bp
from src.auth.routes import auth_bp
from src.common.app import APP_SERVICES_EXTENSION
from src.common.web import register_api_access, register_errors
from src.config import (
    load_address_config,
    load_api_access_config,
    load_app_config,
    load_email_config,
)
from src.db import migrate
from src.health.routes import health_bp
from src.media.routes import media_bp
from src.products.routes import products_bp


def create_app(config_path: str | None = None) -> Flask:
    config = load_app_config(config_path)
    api_access = load_api_access_config()
    address_config = load_address_config()
    email_config = load_email_config()
    migrate(config.database_path)

    app = Flask(__name__)
    app.config.from_mapping(
        API_ACCESS_KEY=api_access.api_key,
        AUTH_COOKIE_SECURE=config.cookie_secure,
        AUTH_LOGIN_MFA_LIFETIME_SECONDS=config.login_mfa_lifetime_seconds,
        AUTH_SESSION_COOKIE_NAME=config.session_cookie_name,
        AUTH_SESSION_LIFETIME_SECONDS=config.session_lifetime_seconds,
        AUTH_TRUSTED_SESSION_COOKIE_NAME=config.trusted_session_cookie_name,
        AUTH_TRUSTED_SESSION_LIFETIME_SECONDS=(config.trusted_session_lifetime_seconds),
        VERIFICATION_CODE_LIFETIME_SECONDS=config.verification_code_lifetime_seconds,
        WEB_URL=config.web_url,
    )
    app.extensions[APP_SERVICES_EXTENSION] = build_app_services(
        address_config=address_config,
        app_config=config,
        email_config=email_config,
    )

    register_api_access(app)
    register_errors(app)

    for blueprint in (
        health_bp,
        media_bp,
        addresses_bp,
        products_bp,
        auth_bp,
        access_logs_bp,
        audit_bp,
    ):
        app.register_blueprint(blueprint, url_prefix="/api")
    return app
