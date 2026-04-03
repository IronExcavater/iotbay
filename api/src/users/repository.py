import sqlite3

from src.addresses.models import ValidatedAddress
from src.addresses.repository import AddressRepository
from src.common.audit_log_repository import AuditLogRepository
from src.common.clock import UtcTime
from src.common.repository import Repository
from src.common.text import stripped_or_none
from src.common.web import ApiError
from src.users.models import (
    ENTITY_TYPE_USER,
    STAFF_PERMISSION_ADMIN,
    USER_TYPE_CUSTOMER,
    User,
    UserSession,
    UserToken,
)
from src.users.queries import SELECT_USER


class DuplicateEmailError(ApiError):
    def __init__(self) -> None:
        super().__init__("email already exists", 409, code="EMAIL_EXISTS")


class UserRepository(Repository):
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
    ) -> UserSession:
        session = UserSession(
            user_id=user_id,
            session_token_hash=session_token_hash,
            created_at=created_at,
            expires_at=expires_at,
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
                },
            )

        return session

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

    def select_user_by_email(self, *, email: str) -> User | None:
        return self._select_user(
            "WHERE users.email = ?",
            (email,),
        )

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
        designation: str | None = None,
        permission: str | None = None,
        status: str | None = None,
        updated_at: str,
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
                    designation=designation,
                    permission=permission,
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
    ) -> User:
        with self.connect() as connection:
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
                updated_by_user_id=user_id,
            )

        return self._require_user(user_id, "updated user was not found")

    def delete_user_session_by_token_hash(
        self,
        *,
        session_token_hash: str,
    ) -> None:
        with self.connect() as connection:
            self.delete_from(
                connection,
                "user_sessions",
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
        with self.connect() as connection:
            self.delete_from(
                connection,
                "user_sessions",
                where="user_id = ?",
                where_parameters=(user_id,),
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
        designation: str | None,
        permission: str | None,
    ) -> None:
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
                "designation": stripped_or_none(designation),
                "permission": permission or STAFF_PERMISSION_ADMIN,
            },
            conflict_columns=("user_id",),
            update_columns=("designation", "permission"),
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
