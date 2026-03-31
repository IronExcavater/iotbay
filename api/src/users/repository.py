from src.common.clock import UtcTime
from src.common.repository import Repository
from src.users.models import Address, User


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

        return user

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
