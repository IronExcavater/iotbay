from flask import Blueprint
from src.config import load_email_config

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    return {"status": "ok"}, 200


@health_bp.get("/app")
def app_info():
    contact_email = load_email_config().sender or "support@iotbay.com"
    return {"contactEmail": contact_email}, 200
