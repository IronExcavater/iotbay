import sqlite3

from src.addresses.models import ValidatedAddress
from src.addresses.repository import AddressRepository
from src.common.audit_log_repository import AuditLogRepository
from src.common.clock import UtcTime
from src.common.repository import Repository
from src.common.text import stripped_or_none
from src.common.web import ApiError
from src.users.models import (
    AUTH_METHOD_PASSWORD,
    ENTITY_TYPE_USER,
    STAFF_PERMISSION_ADMIN,
    USER_TYPE_CUSTOMER,
    AuthChallenge,
    TrustedSessionToken,
    User,
    UserMfaSettings,
    UserSession,
    UserSessionInfo,
    UserToken,
)
from src.users.queries import LIST_USERS, SELECT_USER


class DuplicateEmailError(ApiError):
    def __init__(self) -> None:
        super().__init__("email already exists", 409, code="EMAIL_EXISTS")


def _optional_string(value: object) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


class UserRepository(Repository):
    # A user is split across the base users row plus exactly one detail table:
    # customers or staff. The helpers below keep those side tables in sync.
    def __init__(self, database_path: str) -> None:
        super().__init__(database_path)
        self._addresses = AddressRepository(database_path)
        self._audit_logs = AuditLogRepository(database_path)

    def insert_user(
        self,
        *,
        email: str,
        password_hash: str,
        first_name: str,
        last_name: str,
        user_type: str,
        status: str,
        phone_number: str | None = None,
        validated_address: ValidatedAddress | None = None,
        address_line_two: str | None = None,
        staff_id: str | None = None,
        designation: str | None = None,
        permission: str | None = None,
    ) -> User:
        saved_at = UtcTime.now().iso
        user = User(
            email=email,
            password_hash=password_hash,
            first_name=first_name,
            last_name=last_name,
            user_type=user_type,
            status=status,
            created_at=saved_at,
            updated_at=saved_at,
        )

        try:
            with self.connect() as connection:
                self._insert_user_row(connection, user=user)
                self._audit_logs.insert_audit_log(
                    connection,
                    entity_type=ENTITY_TYPE_USER,
                    entity_id=user.user_id,
                    created_at=user.created_at,
                    updated_at=user.updated_at,
                )
                self._upsert_user_details(
                    connection,
                    user_id=user.user_id,
                    user_type=user_type,
                    phone_number=phone_number,
                    validated_address=validated_address,
                    address_line_two=address_line_two,
                    staff_id=staff_id,
                    designation=designation,
                    permission=permission,
                )
        except sqlite3.IntegrityError as error:
            raise DuplicateEmailError() from error

        return self._require_user(user.user_id, "created user was not found")

    def upsert_user(
        self,
        *,
        email: str,
        password_hash: str,
        first_name: str,
        last_name: str,
        user_type: str,
        status: str,
        phone_number: str | None = None,
        validated_address: ValidatedAddress | None = None,
        address_line_two: str | None = None,
        staff_id: str | None = None,
        designation: str | None = None,
        permission: str | None = None,
    ) -> User:
        existing_user = self.select_user_by_email(email=email)
        if existing_user is None:
            return self.insert_user(
                email=email,
                password_hash=password_hash,
                first_name=first_name,
                last_name=last_name,
                user_type=user_type,
                status=status,
                phone_number=phone_number,
                validated_address=validated_address,
                address_line_two=address_line_two,
                staff_id=staff_id,
                designation=designation,
                permission=permission,
            )

        try:
            with self.connect() as connection:
                self._update_user_row(
                    connection,
                    user_id=existing_user.user_id,
                    password_hash=password_hash,
                    first_name=first_name,
                    last_name=last_name,
                    user_type=user_type,
                    status=status,
                )
                self._upsert_user_details(
                    connection,
                    user_id=existing_user.user_id,
                    user_type=user_type,
                    phone_number=phone_number,
                    validated_address=validated_address,
                    address_line_two=address_line_two,
                    staff_id=staff_id,
                    designation=designation,
                    permission=permission,
                )
                self._audit_logs.update_audit_log(
                    connection,
                    entity_type=ENTITY_TYPE_USER,
                    entity_id=existing_user.user_id,
                    updated_at=UtcTime.now().iso,
                )
        except sqlite3.IntegrityError as error:
            raise DuplicateEmailError() from error

        return self._require_user(existing_user.user_id, "updated user was not found")

    def _update_user_row(
        self,
        connection: sqlite3.Connection,
        *,
        user_id: bytes,
        email: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        status: str | None = None,
        password_hash: str | None = None,
        user_type: str | None = None,
    ) -> None:
        values = {
            "password_hash": password_hash,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "user_type": user_type,
            "status": status,
        }
        update_values: dict[str, object] = {
            column: value for column, value in values.items() if value is not None
        }

        if not update_values:
            return

        self.update_where(
            connection,
            "users",
            update_values,
            where="user_id = ?",
            where_parameters=(user_id,),
        )

    def insert_user_session(
        self,
        *,
        user_id: bytes,
        session_token_hash: str,
        created_at: str,
        expires_at: str,
        auth_method: str = AUTH_METHOD_PASSWORD,
        mfa_verified_at: str | None = None,
        trusted_token_id: bytes | None = None,
    ) -> UserSession:
        # Only the hashed token is persisted so leaking the database still
        # doesn't reveal the raw browser session cookie value.
        session = UserSession(
            user_id=user_id,
            session_token_hash=session_token_hash,
            created_at=created_at,
            expires_at=expires_at,
            auth_method=auth_method,
            last_seen_at=created_at,
            mfa_verified_at=mfa_verified_at,
            trusted_token_id=trusted_token_id,
        )

        with self.connect() as connection:
            self.insert_into(
                connection,
                "user_sessions",
                {
                    "session_id": session.session_id,
                    "user_id": session.user_id,
                    "session_token_hash": session.session_token_hash,
                    "created_at": session.created_at,
                    "expires_at": session.expires_at,
                    "ended_at": session.ended_at,
                    "ended_reason": session.ended_reason,
                    "last_seen_at": session.last_seen_at,
                    "mfa_verified_at": session.mfa_verified_at,
                    "trusted_token_id": session.trusted_token_id,
                    "auth_method": session.auth_method,
                },
            )

        return session

    def select_session_by_token_hash(
        self,
        *,
        session_token_hash: str,
    ) -> UserSession | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT *
                FROM user_sessions
                WHERE session_token_hash = ?
                """,
                (session_token_hash,),
            ).fetchone()
        return UserSession.from_row(row) if row is not None else None

    def list_user_sessions(
        self,
        *,
        user_id: bytes,
        current_session_token_hash: str | None,
        now_iso: str,
    ) -> list[UserSessionInfo]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT
                    user_sessions.*,
                    trusted_session_tokens.expires_at AS trusted_expires_at,
                    latest_logs.occurred_at AS latest_access_at,
                    latest_logs.event_type AS latest_event_type,
                    latest_logs.ip_address AS latest_ip_address,
                    latest_logs.user_agent AS latest_user_agent,
                    user_sessions.session_token_hash = ? AS is_current
                FROM user_sessions
                LEFT JOIN trusted_session_tokens
                    ON trusted_session_tokens.trusted_session_token_id =
                        user_sessions.trusted_token_id
                LEFT JOIN access_logs AS latest_logs
                    ON latest_logs.access_log_id = (
                        SELECT access_logs.access_log_id
                        FROM access_logs
                        WHERE access_logs.session_id = user_sessions.session_id
                        ORDER BY access_logs.occurred_at DESC,
                            access_logs.access_log_id DESC
                        LIMIT 1
                    )
                WHERE user_sessions.user_id = ?
                  AND user_sessions.ended_at IS NULL
                  AND user_sessions.expires_at > ?
                ORDER BY user_sessions.last_seen_at DESC, user_sessions.created_at DESC
                """,
                (current_session_token_hash or "", user_id, now_iso),
            ).fetchall()
        return [UserSessionInfo.from_row(row) for row in rows]

    def end_user_session(
        self,
        connection: sqlite3.Connection,
        *,
        session_id: bytes,
        ended_at: str,
        ended_reason: str,
    ) -> int:
        return self.update_where(
            connection,
            "user_sessions",
            {
                "ended_at": ended_at,
                "ended_reason": ended_reason,
                "last_seen_at": ended_at,
            },
            where="session_id = ? AND ended_at IS NULL",
            where_parameters=(session_id,),
        )

    def end_user_sessions_by_user_id(
        self,
        *,
        user_id: bytes,
        ended_at: str,
        ended_reason: str,
    ) -> int:
        with self.connect() as connection:
            return self.update_where(
                connection,
                "user_sessions",
                {
                    "ended_at": ended_at,
                    "ended_reason": ended_reason,
                    "last_seen_at": ended_at,
                },
                where="user_id = ? AND ended_at IS NULL",
                where_parameters=(user_id,),
            )

    def select_active_session_for_user(
        self,
        *,
        session_id: bytes,
        user_id: bytes,
        now_iso: str,
    ) -> UserSession | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT *
                FROM user_sessions
                WHERE session_id = ?
                  AND user_id = ?
                  AND ended_at IS NULL
                  AND expires_at > ?
                """,
                (session_id, user_id, now_iso),
            ).fetchone()
        return UserSession.from_row(row) if row is not None else None

    def update_session_last_seen(
        self,
        *,
        session_token_hash: str,
        last_seen_at: str,
    ) -> None:
        with self.connect() as connection:
            self.update_where(
                connection,
                "user_sessions",
                {"last_seen_at": last_seen_at},
                where="session_token_hash = ? AND ended_at IS NULL",
                where_parameters=(session_token_hash,),
            )

    def upsert_user_token(
        self,
        *,
        user_id: bytes,
        purpose: str,
        token_hash: str,
        created_at: str,
        expires_at: str,
    ) -> UserToken:
        user_token = UserToken(
            user_id=user_id,
            purpose=purpose,
            token_hash=token_hash,
            created_at=created_at,
            expires_at=expires_at,
        )
        with self.connect() as connection:
            self.upsert_on_conflict(
                connection,
                "user_tokens",
                {
                    "user_token_id": user_token.user_token_id,
                    "user_id": user_token.user_id,
                    "purpose": user_token.purpose,
                    "token_hash": user_token.token_hash,
                    "created_at": user_token.created_at,
                    "expires_at": user_token.expires_at,
                },
                conflict_columns=("user_id", "purpose"),
                update_columns=(
                    "user_token_id",
                    "token_hash",
                    "created_at",
                    "expires_at",
                ),
            )
        return user_token

    def select_mfa_settings(self, *, user_id: bytes) -> UserMfaSettings | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT
                    user_id,
                    email_enabled > 0 AS email_enabled,
                    created_at,
                    enabled_at,
                    updated_at
                FROM user_mfa_settings
                WHERE user_id = ?
                """,
                (user_id,),
            ).fetchone()
        return UserMfaSettings.from_row(row) if row is not None else None

    def upsert_mfa_settings(
        self,
        *,
        user_id: bytes,
        email_enabled: bool,
        updated_at: str,
    ) -> UserMfaSettings:
        existing = self.select_mfa_settings(user_id=user_id)
        created_at = existing.created_at if existing is not None else updated_at
        enabled_at = (
            updated_at
            if email_enabled and (existing is None or not existing.email_enabled)
            else (existing.enabled_at if existing is not None else None)
        )
        with self.connect() as connection:
            self.upsert_on_conflict(
                connection,
                "user_mfa_settings",
                {
                    "user_id": user_id,
                    "email_enabled": 1 if email_enabled else 0,
                    "created_at": created_at,
                    "enabled_at": enabled_at,
                    "updated_at": updated_at,
                },
                conflict_columns=("user_id",),
            )
        settings = self.select_mfa_settings(user_id=user_id)
        if settings is None:
            raise RuntimeError("MFA settings were not saved")
        return settings

    def insert_auth_challenge(
        self,
        *,
        user_id: bytes,
        purpose: str,
        delivery_email: str,
        code_hash: str,
        requested_trust: bool,
        created_at: str,
        expires_at: str,
    ) -> AuthChallenge:
        challenge = AuthChallenge(
            user_id=user_id,
            purpose=purpose,
            delivery_email=delivery_email,
            code_hash=code_hash,
            requested_trust=requested_trust,
            created_at=created_at,
            last_sent_at=created_at,
            expires_at=expires_at,
        )
        with self.connect() as connection:
            self.update_where(
                connection,
                "auth_challenges",
                {"invalidated_at": created_at},
                where=(
                    "user_id = ? AND purpose = ? AND completed_at IS NULL "
                    "AND invalidated_at IS NULL"
                ),
                where_parameters=(user_id, purpose),
            )
            self.insert_into(
                connection,
                "auth_challenges",
                {
                    "auth_challenge_id": challenge.auth_challenge_id,
                    "user_id": challenge.user_id,
                    "purpose": challenge.purpose,
                    "delivery_email": challenge.delivery_email,
                    "code_hash": challenge.code_hash,
                    "requested_trust": 1 if challenge.requested_trust else 0,
                    "created_at": challenge.created_at,
                    "last_sent_at": challenge.last_sent_at,
                    "expires_at": challenge.expires_at,
                    "completed_at": challenge.completed_at,
                    "invalidated_at": challenge.invalidated_at,
                    "attempt_count": challenge.attempt_count,
                },
            )
        return challenge

    def select_auth_challenge(
        self,
        *,
        auth_challenge_id: bytes,
        purpose: str,
        now_iso: str,
    ) -> AuthChallenge | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT
                    auth_challenge_id,
                    user_id,
                    purpose,
                    delivery_email,
                    code_hash,
                    requested_trust > 0 AS requested_trust,
                    created_at,
                    last_sent_at,
                    expires_at,
                    completed_at,
                    invalidated_at,
                    attempt_count
                FROM auth_challenges
                WHERE auth_challenge_id = ?
                  AND purpose = ?
                  AND expires_at > ?
                  AND completed_at IS NULL
                  AND invalidated_at IS NULL
                """,
                (auth_challenge_id, purpose, now_iso),
            ).fetchone()
        return AuthChallenge.from_row(row) if row is not None else None

    def complete_auth_challenge(
        self,
        *,
        auth_challenge_id: bytes,
        completed_at: str,
    ) -> None:
        with self.connect() as connection:
            self.update_where(
                connection,
                "auth_challenges",
                {"completed_at": completed_at},
                where="auth_challenge_id = ?",
                where_parameters=(auth_challenge_id,),
            )

    def increment_auth_challenge_attempts(
        self,
        *,
        auth_challenge_id: bytes,
    ) -> int:
        with self.connect() as connection:
            connection.execute(
                """
                UPDATE auth_challenges
                SET attempt_count = attempt_count + 1
                WHERE auth_challenge_id = ?
                """,
                (auth_challenge_id,),
            )
            row = connection.execute(
                """
                SELECT attempt_count
                FROM auth_challenges
                WHERE auth_challenge_id = ?
                """,
                (auth_challenge_id,),
            ).fetchone()
        return int(row["attempt_count"]) if row is not None else 0

    def insert_trusted_session_token(
        self,
        *,
        user_id: bytes,
        token_hash: str,
        created_at: str,
        expires_at: str,
    ) -> TrustedSessionToken:
        trusted_token = TrustedSessionToken(
            user_id=user_id,
            token_hash=token_hash,
            created_at=created_at,
            last_used_at=created_at,
            expires_at=expires_at,
        )
        with self.connect() as connection:
            self.insert_into(
                connection,
                "trusted_session_tokens",
                {
                    "trusted_session_token_id": (
                        trusted_token.trusted_session_token_id
                    ),
                    "user_id": trusted_token.user_id,
                    "token_hash": trusted_token.token_hash,
                    "created_at": trusted_token.created_at,
                    "last_used_at": trusted_token.last_used_at,
                    "expires_at": trusted_token.expires_at,
                    "revoked_at": trusted_token.revoked_at,
                    "revoked_reason": trusted_token.revoked_reason,
                },
            )
        return trusted_token

    def select_valid_trusted_session_token(
        self,
        *,
        user_id: bytes,
        token_hash: str,
        now_iso: str,
    ) -> TrustedSessionToken | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT *
                FROM trusted_session_tokens
                WHERE user_id = ?
                  AND token_hash = ?
                  AND expires_at > ?
                  AND revoked_at IS NULL
                """,
                (user_id, token_hash, now_iso),
            ).fetchone()
            if row is not None:
                self.update_where(
                    connection,
                    "trusted_session_tokens",
                    {"last_used_at": now_iso},
                    where="trusted_session_token_id = ?",
                    where_parameters=(row["trusted_session_token_id"],),
                )
        return TrustedSessionToken.from_row(row) if row is not None else None

    def select_user_by_email(self, *, email: str) -> User | None:
        return self._select_user(
            "WHERE users.email = ?",
            (email,),
        )

    def list_users(self) -> list[User]:
        with self.connect() as connection:
            rows = connection.execute(LIST_USERS, (ENTITY_TYPE_USER,)).fetchall()
        return [User.from_row(row) for row in rows]

    def select_user_by_id(self, *, user_id: bytes) -> User | None:
        return self._select_user(
            "WHERE users.user_id = ?",
            (user_id,),
        )

    def select_user_by_session_token_hash(
        self,
        *,
        session_token_hash: str,
        now_iso: str,
    ) -> User | None:
        return self._select_user(
            """
            JOIN user_sessions
                ON user_sessions.user_id = users.user_id
            WHERE user_sessions.session_token_hash = ?
              AND user_sessions.expires_at > ?
              AND user_sessions.ended_at IS NULL
            """,
            (session_token_hash, now_iso),
        )

    def select_user_by_token_hash(
        self,
        *,
        token_hash: str,
        purpose: str,
        now_iso: str,
    ) -> User | None:
        return self._select_user(
            """
            JOIN user_tokens
                ON user_tokens.user_id = users.user_id
            WHERE user_tokens.token_hash = ?
              AND user_tokens.purpose = ?
              AND user_tokens.expires_at > ?
            """,
            (token_hash, purpose, now_iso),
        )

    def update_user(
        self,
        *,
        user_id: bytes,
        email: str,
        first_name: str,
        last_name: str,
        phone_number: str | None = None,
        validated_address: ValidatedAddress | None = None,
        address_line_two: str | None = None,
        staff_id: str | None = None,
        designation: str | None = None,
        permission: str | None = None,
        status: str | None = None,
        updated_at: str,
        updated_by_user_id: bytes | None = None,
    ) -> User:
        current_user = self.select_user_by_id(user_id=user_id)
        if current_user is None:
            raise RuntimeError("user was not found")

        try:
            with self.connect() as connection:
                self._update_user_row(
                    connection,
                    user_id=user_id,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    status=status,
                )

                self._upsert_user_details(
                    connection,
                    user_id=user_id,
                    user_type=current_user.user_type,
                    phone_number=phone_number,
                    validated_address=validated_address,
                    address_line_two=address_line_two,
                    staff_id=staff_id,
                    designation=designation,
                    permission=permission,
                )
                self._audit_logs.update_audit_log(
                    connection,
                    entity_type=ENTITY_TYPE_USER,
                    entity_id=user_id,
                    updated_at=updated_at,
                    updated_by_user_id=updated_by_user_id or user_id,
                )
        except sqlite3.IntegrityError as error:
            raise DuplicateEmailError() from error

        return self._require_user(user_id, "updated user was not found")

    def admin_update_user(
        self,
        *,
        user_id: bytes,
        email: str,
        first_name: str,
        last_name: str,
        staff_id: str | None = None,
        designation: str | None = None,
        permission: str | None = None,
        updated_at: str,
        updated_by_user_id: bytes,
    ) -> User:
        current_user = self.select_user_by_id(user_id=user_id)
        if current_user is None:
            raise RuntimeError("user was not found")

        try:
            with self.connect() as connection:
                self._update_user_row(
                    connection,
                    user_id=user_id,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )

                if current_user.user_type != USER_TYPE_CUSTOMER:
                    self._upsert_staff_details(
                        connection,
                        user_id=user_id,
                        staff_id=staff_id,
                        designation=designation,
                        permission=permission,
                    )

                self._audit_logs.update_audit_log(
                    connection,
                    entity_type=ENTITY_TYPE_USER,
                    entity_id=user_id,
                    updated_at=updated_at,
                    updated_by_user_id=updated_by_user_id,
                )
        except sqlite3.IntegrityError as error:
            raise DuplicateEmailError() from error

        return self._require_user(user_id, "updated user was not found")

    def update_user_password(
        self,
        *,
        user_id: bytes,
        password_hash: str,
        updated_at: str,
    ) -> None:
        with self.connect() as connection:
            self._update_user_row(
                connection,
                user_id=user_id,
                password_hash=password_hash,
            )
            self._audit_logs.update_audit_log(
                connection,
                entity_type=ENTITY_TYPE_USER,
                entity_id=user_id,
                updated_at=updated_at,
                updated_by_user_id=user_id,
            )

    def update_user_email(
        self,
        *,
        user_id: bytes,
        email: str,
        status: str,
        updated_at: str,
    ) -> User:
        try:
            with self.connect() as connection:
                self._update_user_row(
                    connection,
                    user_id=user_id,
                    email=email,
                    status=status,
                )
                self._audit_logs.update_audit_log(
                    connection,
                    entity_type=ENTITY_TYPE_USER,
                    entity_id=user_id,
                    updated_at=updated_at,
                    updated_by_user_id=user_id,
                )
        except sqlite3.IntegrityError as error:
            raise DuplicateEmailError() from error

        return self._require_user(user_id, "updated user was not found")

    def update_user_status(
        self,
        *,
        user_id: bytes,
        status: str,
        updated_at: str,
        updated_by_user_id: bytes | None = None,
    ) -> User:
        with self.connect() as connection:
            # Status changes keep the existing user record in the users table;
            # account cancellation/deactivation can therefore mark the account
            # inactive without deleting its database row.
            self.update_where(
                connection,
                "users",
                {"status": status},
                where="user_id = ?",
                where_parameters=(user_id,),
            )
            self._audit_logs.update_audit_log(
                connection,
                entity_type=ENTITY_TYPE_USER,
                entity_id=user_id,
                updated_at=updated_at,
                updated_by_user_id=updated_by_user_id or user_id,
            )

        return self._require_user(user_id, "updated user was not found")

    def apply_user_snapshot(
        self,
        *,
        user_id: bytes,
        snapshot: dict[str, object],
        updated_at: str,
        updated_by_user_id: bytes,
    ) -> User:
        current_user = self.select_user_by_id(user_id=user_id)
        if current_user is None:
            raise RuntimeError("user was not found")

        with self.connect() as connection:
            self._update_user_row(
                connection,
                user_id=user_id,
                email=str(snapshot.get("email") or current_user.email),
                first_name=str(snapshot.get("firstName") or current_user.first_name),
                last_name=str(snapshot.get("lastName") or current_user.last_name),
                status=str(snapshot.get("status") or current_user.status),
            )
            if current_user.user_type != USER_TYPE_CUSTOMER:
                self._upsert_staff_details(
                    connection,
                    user_id=user_id,
                    staff_id=_optional_string(snapshot.get("staffId")),
                    designation=_optional_string(snapshot.get("designation")),
                    permission=_optional_string(snapshot.get("permission")),
                )
            self._audit_logs.update_audit_log(
                connection,
                entity_type=ENTITY_TYPE_USER,
                entity_id=user_id,
                updated_at=updated_at,
                updated_by_user_id=updated_by_user_id,
            )

        return self._require_user(user_id, "updated user was not found")

    def delete_user_session_by_token_hash(
        self,
        *,
        session_token_hash: str,
    ) -> None:
        with self.connect() as connection:
            self.update_where(
                connection,
                "user_sessions",
                {"ended_at": UtcTime.now().iso, "ended_reason": "logout"},
                where="session_token_hash = ?",
                where_parameters=(session_token_hash,),
            )

    def delete_user_token_by_hash(self, *, token_hash: str) -> None:
        with self.connect() as connection:
            self.delete_from(
                connection,
                "user_tokens",
                where="token_hash = ?",
                where_parameters=(token_hash,),
            )

    def delete_user_tokens_by_user_id_and_purpose(
        self,
        *,
        user_id: bytes,
        purpose: str,
    ) -> None:
        with self.connect() as connection:
            self.delete_from(
                connection,
                "user_tokens",
                where="user_id = ? AND purpose = ?",
                where_parameters=(user_id, purpose),
            )

    def delete_user_sessions_by_user_id(self, *, user_id: bytes) -> None:
        now_iso = UtcTime.now().iso
        self.end_user_sessions_by_user_id(
            user_id=user_id,
            ended_at=now_iso,
            ended_reason="ended",
        )

    def _select_user(
        self,
        where_clause: str,
        parameters: tuple[object, ...],
    ) -> User | None:
        with self.connect() as connection:
            row = connection.execute(
                f"{SELECT_USER}\n{where_clause}",
                (ENTITY_TYPE_USER, *parameters),
            ).fetchone()

        if row is None:
            return None

        return User.from_row(row)

    def _insert_user_row(
        self,
        connection: sqlite3.Connection,
        *,
        user: User,
    ) -> None:
        self.insert_into(
            connection,
            "users",
            {
                "user_id": user.user_id,
                "email": user.email,
                "password_hash": user.password_hash,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "user_type": user.user_type,
                "status": user.status,
            },
        )

    def _upsert_user_details(
        self,
        connection: sqlite3.Connection,
        *,
        user_id: bytes,
        user_type: str,
        phone_number: str | None,
        validated_address: ValidatedAddress | None,
        address_line_two: str | None,
        staff_id: str | None,
        designation: str | None,
        permission: str | None,
    ) -> None:
        # Customer and staff detail tables are mutually exclusive, so each write
        # updates the relevant side table and clears the other one.
        if user_type == USER_TYPE_CUSTOMER:
            self._upsert_customer_details(
                connection,
                user_id=user_id,
                phone_number=phone_number,
                validated_address=validated_address,
                address_line_two=address_line_two,
            )
            return

        self._upsert_staff_details(
            connection,
            user_id=user_id,
            staff_id=staff_id,
            designation=designation,
            permission=permission,
        )

    def _upsert_customer_details(
        self,
        connection: sqlite3.Connection,
        *,
        user_id: bytes,
        phone_number: str | None,
        validated_address: ValidatedAddress | None,
        address_line_two: str | None,
    ) -> None:
        # Address rows are normalized into the shared addresses table, so
        # customer detail updates may need to create, update, or delete an
        # address row alongside the customer record.
        current_address_id = self._select_customer_address_id(
            connection,
            user_id=user_id,
        )
        address_id = self._addresses.upsert_address(
            connection,
            address_id=current_address_id,
            validated_address=validated_address,
            address_line_two=address_line_two,
        )
        self.upsert_on_conflict(
            connection,
            "customers",
            {
                "user_id": user_id,
                "address_id": address_id,
                "phone_number": stripped_or_none(phone_number),
            },
            conflict_columns=("user_id",),
            update_columns=("address_id", "phone_number"),
        )
        self._delete_user_details_row(connection, "staff", user_id=user_id)
        if address_id is None:
            self._addresses.delete_address(connection, address_id=current_address_id)

    def _upsert_staff_details(
        self,
        connection: sqlite3.Connection,
        *,
        user_id: bytes,
        staff_id: str | None,
        designation: str | None,
        permission: str | None,
    ) -> None:
        current_address_id = self._select_customer_address_id(
            connection,
            user_id=user_id,
        )
        self.upsert_on_conflict(
            connection,
            "staff",
            {
                "user_id": user_id,
                "staff_id": stripped_or_none(staff_id),
                "designation": stripped_or_none(designation),
                "permission": permission or STAFF_PERMISSION_ADMIN,
            },
            conflict_columns=("user_id",),
            update_columns=("staff_id", "designation", "permission"),
        )
        self._delete_user_details_row(connection, "customers", user_id=user_id)
        self._addresses.delete_address(connection, address_id=current_address_id)

    def _select_customer_address_id(
        self,
        connection: sqlite3.Connection,
        *,
        user_id: bytes,
    ) -> bytes | None:
        customer_row = connection.execute(
            """
            SELECT address_id
            FROM customers
            WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()
        if customer_row is None or customer_row["address_id"] is None:
            return None

        return customer_row["address_id"]

    def _delete_user_details_row(
        self,
        connection: sqlite3.Connection,
        table_name: str,
        *,
        user_id: bytes,
    ) -> None:
        self.delete_from(
            connection,
            table_name,
            where="user_id = ?",
            where_parameters=(user_id,),
        )

    def _require_user(self, user_id: bytes, message: str) -> User:
        user = self.select_user_by_id(user_id=user_id)
        if user is None:
            raise RuntimeError(message)
        return user
