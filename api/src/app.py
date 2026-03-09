"""Flask app factory and route registration."""

from flask import Flask

from .routes.health import health_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.register_blueprint(health_bp, url_prefix="/api")
    return app
