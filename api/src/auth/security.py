import hashlib
import hmac
import secrets

from src.common.web import ValidationError

PASSWORD_HASH_ITERATIONS = 600_000
PASSWORD_MIN_LENGTH = 8


def validate_password(password: str) -> str:
    value = password.strip()
    if len(value) < PASSWORD_MIN_LENGTH:
        raise ValidationError("password must be at least 8 characters")
    return value


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_HASH_ITERATIONS,
    )
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    algorithm, iterations, salt_hex, digest_hex = password_hash.split("$", maxsplit=3)
    if algorithm != "pbkdf2_sha256":
        raise ValueError("unsupported password hash algorithm")

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        int(iterations),
    )
    return hmac.compare_digest(digest.hex(), digest_hex)


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(session_token: str) -> str:
    return hashlib.sha256(session_token.encode("utf-8")).hexdigest()
