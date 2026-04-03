from flask import Flask
from src.addresses.google_maps_api import GoogleMapsApi
from src.addresses.routes import addresses_bp
from src.addresses.service import AddressService
from src.auth.routes import auth_bp
from src.auth.service import AuthService
from src.common.web import register_errors
from src.config import (
    load_address_config,
    load_api_access_config,
    load_app_config,
    load_email_config,
)
from src.db import migrate
from src.emails.service import EmailService
from src.health.routes import health_bp
from src.products.repository import ProductRepository
from src.products.routes import products_bp
from src.users.repository import UserRepository


def create_app(config_path: str | None = None) -> Flask:
    config = load_app_config(config_path)
    api_access = load_api_access_config()
    address_config = load_address_config()
    email_config = load_email_config()
    migrate(config.database_path)

    address_service = AddressService(GoogleMapsApi(address_config))
    user_repository = UserRepository(config.database_path)

    app = Flask(__name__)
    app.config.from_mapping(
        API_ACCESS_KEY=api_access.api_key,
        AUTH_COOKIE_SECURE=config.cookie_secure,
        AUTH_SESSION_COOKIE_NAME=config.session_cookie_name,
        AUTH_SESSION_LIFETIME_SECONDS=config.session_lifetime_seconds,
        VERIFICATION_CODE_LIFETIME_SECONDS=config.verification_code_lifetime_seconds,
        WEB_URL=config.web_url,
    )

    app.extensions.update(
        address_service=address_service,
        auth_service=AuthService(
            address_service=address_service,
            email_service=EmailService(email_config),
            password_reset_lifetime_seconds=900,
            session_lifetime_seconds=config.session_lifetime_seconds,
            user_repository=user_repository,
            verification_lifetime_seconds=config.verification_code_lifetime_seconds,
            web_url=config.web_url,
        ),
        product_repository=ProductRepository(config.database_path),
        user_repository=user_repository,
    )

    register_errors(app)

    for blueprint in (health_bp, addresses_bp, products_bp, auth_bp):
        app.register_blueprint(blueprint, url_prefix="/api")
    return app
