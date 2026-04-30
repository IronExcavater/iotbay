from http import HTTPStatus

from flask import Blueprint
from flask.typing import ResponseReturnValue
from src.access_logs.requests import AccessLogQuery
from src.auth.session import (
    current_authenticated_staff_user,
    current_authenticated_user,
    login_required,
    staff_permission_required,
)
from src.common.app import services
from src.common.web import parse_query
from src.users.models import STAFF_PERMISSION_SUPERADMIN

access_logs_bp = Blueprint("access_logs", __name__)


@access_logs_bp.get("/access-logs")
@login_required
def list_my_access_logs() -> ResponseReturnValue:
    query = parse_query(AccessLogQuery)
    user = current_authenticated_user()
    logs = services().access_log_repository.list_user_access_logs(
        user_id=user.user_id,
        event_type=query.event_type or None,
        from_date=query.from_date or None,
        to_date=query.to_date or None,
    )
    return {"items": [entry.to_dict() for entry in logs]}, HTTPStatus.OK


@access_logs_bp.get("/admin/access-logs")
@staff_permission_required(STAFF_PERMISSION_SUPERADMIN)
def list_admin_access_logs() -> ResponseReturnValue:
    current_authenticated_staff_user(STAFF_PERMISSION_SUPERADMIN)
    query = parse_query(AccessLogQuery)
    logs = services().access_log_repository.list_admin_access_logs(
        event_type=query.event_type or None,
        from_date=query.from_date or None,
        to_date=query.to_date or None,
    )
    return {"items": [entry.to_dict() for entry in logs]}, HTTPStatus.OK
