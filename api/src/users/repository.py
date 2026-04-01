import sqlite3

from src.common.clock import UtcTime
from src.common.repository import Repository
from src.common.web import ApiError
from src.users.models import Address, User, UserSession, UserToken


class DuplicateEmailError(ApiError):
    def __init__(self) -> None:
        super().__init__("email already exists", 409, code="EMAIL_EXISTS")


class UserRepository(Repository):
    def create_address(
        self,
        *,
        address_line_one: str,
        address_line_two: str,
        suburb: str,
        state: str,
        postcode: str,
        country: str,
    ) -> Address:
        address = Address(
            address_line_one=address_line_one,
            address_line_two=address_line_two,
            suburb=suburb,
            state=state,
            postcode=postcode,
            country=country,
        )

        with self.connect() as connection:
            self.insert_into(
                connection,
                "addresses",
                {
                    "address_id": address.address_id,
                    "address_line_one": address.address_line_one,
                    "address_line_two": address.address_line_two,
                    "suburb": address.suburb,
                    "state": address.state,
                    "postcode": address.postcode,
                    "country": address.country,
                },
            )

        return address

    def create_user(
        self,
        *,
        email: str,
        password_hash: str,
        first_name: str,
        last_name: str,
        user_type: str,
        status: str,
        address_id: bytes | None = None,
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
            address_id=address_id,
        )

        try:
            with self.connect() as connection:
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
                        "address_id": user.address_id,
                        "created_at": user.created_at,
                        "updated_at": user.updated_at,
                    },
                )
        except sqlite3.IntegrityError as error:
            raise DuplicateEmailError() from error

        return user

    def create_or_update_user(
        self,
        *,
        email: str,
        password_hash: str,
        first_name: str,
        last_name: str,
        user_type: str,
        status: str,
        address_id: bytes | None = None,
    ) -> User:
        existing_user = self.find_user_by_email(email=email)
        if existing_user is None:
            return self.create_user(
                email=email,
                password_hash=password_hash,
                first_name=first_name,
                last_name=last_name,
                user_type=user_type,
                status=status,
                address_id=address_id,
            )

        try:
            with self.connect() as connection:
                connection.execute(
                    """
                    UPDATE users
                    SET password_hash = ?,
                        first_name = ?,
                        last_name = ?,
                        user_type = ?,
                        status = ?,
                        address_id = ?,
                        updated_at = ?
                    WHERE user_id = ?
                    """,
                    (
                        password_hash,
                        first_name,
                        last_name,
                        user_type,
                        status,
                        address_id,
                        UtcTime.now().iso,
                        existing_user.user_id,
                    ),
                )
        except sqlite3.IntegrityError as error:
            raise DuplicateEmailError() from error

        updated_user = self.find_user_by_id(user_id=existing_user.user_id)
        if updated_user is None:
            raise RuntimeError("updated user was not found")
        return updated_user

    def create_session(
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

    def save_user_token(
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
            connection.execute(
                """
                INSERT INTO user_tokens (
                    user_token_id,
                    user_id,
                    purpose,
                    token_hash,
                    created_at,
                    expires_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, purpose) DO UPDATE SET
                    user_token_id = excluded.user_token_id,
                    token_hash = excluded.token_hash,
                    created_at = excluded.created_at,
                    expires_at = excluded.expires_at
                """,
                (
                    user_token.user_token_id,
                    user_token.user_id,
                    user_token.purpose,
                    user_token.token_hash,
                    user_token.created_at,
                    user_token.expires_at,
                ),
            )
        return user_token

    def find_address_by_id(self, *, address_id: bytes) -> Address | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT *
                FROM addresses
                WHERE address_id = ?
                """,
                (address_id,),
            ).fetchone()

        if row is None:
            return None

        return Address.from_row(row)

    def find_user_by_email(self, *, email: str) -> User | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT *
                FROM users
                WHERE email = ?
                """,
                (email,),
            ).fetchone()

        if row is None:
            return None

        return User.from_row(row)

    def find_user_by_id(self, *, user_id: bytes) -> User | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT *
                FROM users
                WHERE user_id = ?
                """,
                (user_id,),
            ).fetchone()

        if row is None:
            return None

        return User.from_row(row)

    def find_user_by_session_token_hash(
        self,
        *,
        session_token_hash: str,
        now_iso: str,
    ) -> User | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT users.*
                FROM users
                JOIN user_sessions
                    ON user_sessions.user_id = users.user_id
                WHERE user_sessions.session_token_hash = ?
                  AND user_sessions.expires_at > ?
                """,
                (session_token_hash, now_iso),
            ).fetchone()

        if row is None:
            return None

        return User.from_row(row)

    def find_user_by_token_hash(
        self,
        *,
        token_hash: str,
        purpose: str,
        now_iso: str,
    ) -> User | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT users.*
                FROM users
                JOIN user_tokens
                    ON user_tokens.user_id = users.user_id
                WHERE user_tokens.token_hash = ?
                  AND user_tokens.purpose = ?
                  AND user_tokens.expires_at > ?
                """,
                (token_hash, purpose, now_iso),
            ).fetchone()

        if row is None:
            return None

        return User.from_row(row)

    def update_user_profile(
        self,
        *,
        user_id: bytes,
        email: str,
        first_name: str,
        last_name: str,
        updated_at: str,
    ) -> User:
        try:
            with self.connect() as connection:
                connection.execute(
                    """
                    UPDATE users
                    SET email = ?,
                        first_name = ?,
                        last_name = ?,
                        updated_at = ?
                    WHERE user_id = ?
                    """,
                    (email, first_name, last_name, updated_at, user_id),
                )
        except sqlite3.IntegrityError as error:
            raise DuplicateEmailError() from error

        user = self.find_user_by_id(user_id=user_id)
        if user is None:
            raise RuntimeError("updated user was not found")
        return user

    def update_user_password(
        self,
        *,
        user_id: bytes,
        password_hash: str,
        updated_at: str,
    ) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                UPDATE users
                SET password_hash = ?,
                    updated_at = ?
                WHERE user_id = ?
                """,
                (password_hash, updated_at, user_id),
            )

    def update_user_status(
        self,
        *,
        user_id: bytes,
        status: str,
        updated_at: str,
    ) -> User:
        with self.connect() as connection:
            connection.execute(
                """
                UPDATE users
                SET status = ?,
                    updated_at = ?
                WHERE user_id = ?
                """,
                (status, updated_at, user_id),
            )

        user = self.find_user_by_id(user_id=user_id)
        if user is None:
            raise RuntimeError("updated user was not found")
        return user

    def delete_session_by_token_hash(self, *, session_token_hash: str) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                DELETE FROM user_sessions
                WHERE session_token_hash = ?
                """,
                (session_token_hash,),
            )

    def delete_user_token_by_hash(self, *, token_hash: str) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                DELETE FROM user_tokens
                WHERE token_hash = ?
                """,
                (token_hash,),
            )

    def delete_user_tokens_by_user_id_and_purpose(
        self,
        *,
        user_id: bytes,
        purpose: str,
    ) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                DELETE FROM user_tokens
                WHERE user_id = ? AND purpose = ?
                """,
                (user_id, purpose),
            )

    def delete_sessions_by_user_id(self, *, user_id: bytes) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                DELETE FROM user_sessions
                WHERE user_id = ?
                """,
                (user_id,),
            )
