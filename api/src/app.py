import os
from pathlib import Path

from flask import Flask
from src.access_logs.routes import access_logs_bp
from src.addresses.routes import addresses_bp
from src.app_services import build_app_services
from src.audit.routes import audit_bp
from src.auth.routes import auth_bp
from src.cart.routes import cart_bp
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
from src.orders.routes import orders_bp
from src.payment_methods.routes import payment_methods_bp
from src.payments.routes import payments_bp
from src.products.routes import products_bp


def create_app(config_path: str | Path | None = None) -> Flask:
    app = Flask(__name__)

    config = load_app_config(config_path)
    api_access = load_api_access_config()
    email_config = load_email_config()
    address_config = load_address_config()

    # Flask runtime config
    app.config["API_ACCESS_KEY"] = api_access.api_key or os.environ.get(
        "IOTBAY_API_KEY", ""
    )
    app.config["AUTH_COOKIE_SECURE"] = config.cookie_secure
    app.config["AUTH_SESSION_COOKIE_NAME"] = config.session_cookie_name
    app.config["AUTH_SESSION_LIFETIME_SECONDS"] = config.session_lifetime_seconds
    app.config["AUTH_TRUSTED_SESSION_COOKIE_NAME"] = config.trusted_session_cookie_name
    app.config["AUTH_TRUSTED_SESSION_LIFETIME_SECONDS"] = (
        config.trusted_session_lifetime_seconds
    )
    app.config["SESSION_COOKIE_SECURE"] = config.cookie_secure
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

    migrate(config.database_path)

    services = build_app_services(
        address_config=address_config,
        app_config=config,
        email_config=email_config,
    )
    app.extensions[APP_SERVICES_EXTENSION] = services
    # Legacy alias — some older code still looks up by repository name directly
    app.extensions["user_repository"] = services.user_repository

    register_api_access(app)
    register_errors(app)
    register_cors(app)

    url_prefix = "/api"
    for bp in (
        health_bp,
        media_bp,
        addresses_bp,
        products_bp,
        auth_bp,
        access_logs_bp,
        audit_bp,
        orders_bp,
        payment_methods_bp,
        payments_bp,
        cart_bp,
    ):
        app.register_blueprint(bp, url_prefix=url_prefix)

    return app


def register_cors(app: Flask) -> None:
    from flask import Response, request

    allowed_origins_env = os.environ.get("IOTBAY_ALLOWED_ORIGINS", "")
    allowed_origins = {o.strip() for o in allowed_origins_env.split(",") if o.strip()}
    # Always allow local development origins
    allowed_origins |= {"http://localhost:5173", "http://127.0.0.1:5173"}

    def _apply_cors(response: Response, origin: str) -> None:
        if origin not in allowed_origins:
            return
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, x-api-key"
        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, PATCH, DELETE, OPTIONS"
        )

    @app.before_request
    def handle_options():  # type: ignore[return]
        if request.method == "OPTIONS":
            resp = Response()
            _apply_cors(resp, request.headers.get("Origin", ""))
            return resp, 204

    @app.after_request
    def add_cors(response: Response) -> Response:
        _apply_cors(response, request.headers.get("Origin", ""))
        return response
