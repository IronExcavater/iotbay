from dataclasses import dataclass
from typing import cast

from flask import Flask
from src.access_logs.models import ACCESS_EVENT_LOGIN, AccessLogEntry
from src.auth.security import hash_password
from src.common.app import extension_from, services_from
from src.common.clock import UtcTime
from src.users.models import USER_STATUS_ACTIVE, USER_TYPE_CUSTOMER, User
from src.users.repository import UserRepository, UserSession
from werkzeug.test import Client


@dataclass(slots=True, frozen=True)
class AccessLogFixture:
    log: AccessLogEntry
    session: UserSession
    user: User


def create_access_log_fixture(
    client: Client,
    *,
    email: str = "access.logs@example.com",
    event_type: str = ACCESS_EVENT_LOGIN,
    occurred_at: str = "2026-05-04T09:00:00.000000+00:00",
    password: str = "LogPass99$",
    user_agent: str = "Mozilla/5.0 Chrome/123.0 Windows",
) -> AccessLogFixture:
    app = cast(Flask, client.application)
    repository = extension_from(app, "user_repository", UserRepository)
    user = repository.insert_user(
        email=email,
        password_hash=hash_password(password),
        first_name="Access",
        last_name="Logger",
        user_type=USER_TYPE_CUSTOMER,
        status=USER_STATUS_ACTIVE,
    )
    now = UtcTime.parse(occurred_at)
    session = repository.insert_user_session(
        user_id=user.user_id,
        session_token_hash=f"test-session-{email}",
        created_at=now.iso,
        expires_at=now.add(days=1).iso,
    )
    with repository.connect() as connection:
        access_logs = services_from(app).access_log_repository
        log = access_logs.insert_access_log(
            connection,
            event_type=event_type,
            occurred_at=occurred_at,
            session_id=session.session_id,
            user_agent=user_agent,
            user_id=user.user_id,
        )

    return AccessLogFixture(log=log, session=session, user=user)
