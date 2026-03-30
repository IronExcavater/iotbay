from flask import Flask
from src.common.web import register_errors
from src.config import load_app_config
from src.db import migrate
from src.health.routes import health_bp
from src.products.repository import ProductRepository
from src.products.routes import products_bp


def create_app(config_path: str | None = None) -> Flask:
    config = load_app_config(config_path)
    migrate(config.database_path)

    app = Flask(__name__)
    app.config.from_mapping(
        AUTH_COOKIE_SECURE=config.cookie_secure,
        AUTH_SESSION_COOKIE_NAME=config.session_cookie_name,
        AUTH_SESSION_LIFETIME_SECONDS=config.session_lifetime_seconds,
    )

    app.extensions.update(product_repository=ProductRepository(config.database_path))

    register_errors(app)

    for blueprint in (health_bp, products_bp):
        app.register_blueprint(blueprint, url_prefix="/api")

    return app
