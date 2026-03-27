import os

from api.src.products.repository import ProductRepository
from api.src.products.routes import products_bp
from flask import Flask
from src.db import DEFAULT_DB_PATH, migrate
from src.routes.health import health_bp


def create_app(database_path: str | None = None) -> Flask:
    app = Flask(__name__)

    resolved_database_path = (
        database_path or os.environ.get("IOTBAY_DATABASE_PATH") or str(DEFAULT_DB_PATH)
    )
    migrate(resolved_database_path)

    app.extensions["product_repository"] = ProductRepository(resolved_database_path)

    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(products_bp, url_prefix="/api")

    return app
