import json
from http import HTTPStatus
from uuid import UUID

from flask import Blueprint
from flask.typing import ResponseReturnValue
from src.audit.models import (
    AUDIT_ORIGIN_REDO,
    AUDIT_ORIGIN_UNDO,
    ENTITY_TYPE_PRODUCT,
    ENTITY_TYPE_USER,
)
from src.audit.requests import AuditEventQuery
from src.auth.session import (
    current_authenticated_staff_user,
    current_authenticated_user,
    login_required,
    staff_permission_required,
)
from src.common.app import services
from src.common.clock import UtcTime
from src.common.web import ApiError, parse_query
from src.users.models import STAFF_PERMISSION_ADMIN, STAFF_PERMISSION_SUPERADMIN

audit_bp = Blueprint("audit", __name__)


@audit_bp.get("/admin/audit/events")
@staff_permission_required(STAFF_PERMISSION_SUPERADMIN)
def list_audit_events() -> ResponseReturnValue:
    query = parse_query(AuditEventQuery)
    events = services().audit.list_events(
        action=query.action or None,
        entity_type=query.entity_type or None,
        from_date=query.from_date or None,
        to_date=query.to_date or None,
    )
    return {"items": [event.to_dict() for event in events]}, HTTPStatus.OK


@audit_bp.get("/audit/entities/<string:entity_type>/<string:entity_id>")
@login_required
def entity_timeline(entity_type: str, entity_id: str) -> ResponseReturnValue:
    entity_id_bytes = _parse_uuid(entity_id, "entity")
    _require_entity_access(entity_type, entity_id_bytes)
    events = services().audit.list_entity_events(
        entity_id=entity_id_bytes,
        entity_type=entity_type,
    )
    return {
        "events": [_public_event(event).to_dict() for event in events]
    }, HTTPStatus.OK


@audit_bp.post("/audit/events/<string:audit_event_id>/undo")
@login_required
def undo_event(audit_event_id: str) -> ResponseReturnValue:
    return _replay_event(audit_event_id, AUDIT_ORIGIN_UNDO)


@audit_bp.post("/audit/events/<string:audit_event_id>/redo")
@login_required
def redo_event(audit_event_id: str) -> ResponseReturnValue:
    return _replay_event(audit_event_id, AUDIT_ORIGIN_REDO)


def _replay_event(audit_event_id: str, origin: str) -> ResponseReturnValue:
    actor = current_authenticated_user()
    event = services().audit.get_event(
        audit_event_id=_parse_uuid(audit_event_id, "audit event"),
    )
    if event is None:
        raise ApiError("audit event was not found", HTTPStatus.NOT_FOUND)

    _require_entity_access(event.entity_type, event.entity_id, write=True)
    snapshot_json = (
        event.before_json if origin == AUDIT_ORIGIN_UNDO else event.after_json
    )
    if not snapshot_json:
        raise ApiError("change cannot be replayed", HTTPStatus.BAD_REQUEST)
    snapshot = json.loads(snapshot_json)
    if not isinstance(snapshot, dict):
        raise ApiError("change cannot be replayed", HTTPStatus.BAD_REQUEST)

    before = _current_snapshot(event.entity_type, event.entity_id)
    now_iso = UtcTime.now().iso
    if event.entity_type == ENTITY_TYPE_PRODUCT:
        current_authenticated_staff_user(
            STAFF_PERMISSION_ADMIN,
            STAFF_PERMISSION_SUPERADMIN,
        )
        product = services().product_repository.apply_product_snapshot(
            actor_user_id=actor.user_id,
            product_id=event.entity_id,
            snapshot=snapshot,
        )
        after = product.snapshot()
    elif event.entity_type == ENTITY_TYPE_USER:
        user = services().user_repository.apply_user_snapshot(
            user_id=event.entity_id,
            snapshot=snapshot,
            updated_at=now_iso,
            updated_by_user_id=actor.user_id,
        )
        after = user.snapshot()
    else:
        raise ApiError("entity type is invalid", HTTPStatus.BAD_REQUEST)

    with services().audit_repository.connect() as connection:
        replay_event = services().audit.record_event(
            connection,
            action=event.action,
            actor_user_id=actor.user_id,
            after=after,
            before=before,
            entity_id=event.entity_id,
            entity_type=event.entity_type,
            occurred_at=now_iso,
            origin=origin,
            source_audit_event_id=event.audit_event_id,
        )
    return {"event": replay_event.to_dict()}, HTTPStatus.OK


def _current_snapshot(entity_type: str, entity_id: bytes) -> dict[str, object] | None:
    if entity_type == ENTITY_TYPE_PRODUCT:
        product = services().product_repository.select_product_by_id(
            product_id=entity_id
        )
        return product.snapshot() if product is not None else None
    if entity_type == ENTITY_TYPE_USER:
        user = services().user_repository.select_user_by_id(user_id=entity_id)
        return user.snapshot() if user is not None else None
    return None


def _require_entity_access(
    entity_type: str,
    entity_id: bytes,
    *,
    write: bool = False,
) -> None:
    user = current_authenticated_user()
    if entity_type == ENTITY_TYPE_PRODUCT:
        if write:
            current_authenticated_staff_user(
                STAFF_PERMISSION_ADMIN,
                STAFF_PERMISSION_SUPERADMIN,
            )
        return
    if entity_type == ENTITY_TYPE_USER:
        if user.user_id == entity_id:
            return
        current_authenticated_staff_user(STAFF_PERMISSION_SUPERADMIN)
        return
    raise ApiError("entity type is invalid", HTTPStatus.BAD_REQUEST)


def _parse_uuid(value: str, label: str) -> bytes:
    try:
        return UUID(value).bytes
    except ValueError as error:
        raise ApiError(f"{label} is invalid", HTTPStatus.BAD_REQUEST) from error


def _public_event(event):
    current_user = current_authenticated_user()
    if (
        event.entity_type == ENTITY_TYPE_PRODUCT
        and not current_user.is_staff
        and event.actor_user_id != current_user.user_id
    ):
        object.__setattr__(event, "actor_email", None)
        object.__setattr__(event, "actor_first_name", "IoTBay")
        object.__setattr__(event, "actor_last_name", "staff")
        object.__setattr__(event, "actor_profile_image_url", None)
    return event
