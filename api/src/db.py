import os
import re
import sqlite3
import sys
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = ROOT_DIR / "data" / "iotbay.sqlite3"
MIGRATIONS_DIR = ROOT_DIR / "migrations"
SEED_SQL_PATH = ROOT_DIR / "db" / "seed.sql"

MIGRATION_SLUG_PATTERN = re.compile(r"[^a-z0-9]+")


def migrate(database_path: str) -> None:
    with _connect(database_path) as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                name TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            )
            """
        )

        for migration_file in _migration_files():
            if _migration_is_applied(db, migration_file.name):
                continue

            sql = migration_file.read_text(encoding="utf-8")
            db.executescript(sql)
            db.execute(
                (
                    "INSERT INTO schema_migrations (name, applied_at) "
                    "VALUES (?, CURRENT_TIMESTAMP)"
                ),
                (migration_file.name,),
            )


def create_migration(name: str) -> Path:
    slug = _to_slug(name)
    if not slug:
        raise ValueError("migration name must include letters or numbers")

    MIGRATIONS_DIR.mkdir(parents=True, exist_ok=True)
    number = _next_migration_number()
    path = MIGRATIONS_DIR / f"{number:04d}_{slug}.sql"
    path.write_text("-- Add SQL here.\n", encoding="utf-8")
    return path


def seed_apply(database_path: str) -> None:
    migrate(database_path)
    if not SEED_SQL_PATH.exists():
        return

    script = SEED_SQL_PATH.read_text(encoding="utf-8")
    with _connect(database_path) as db:
        db.executescript(script)


def seed_save(database_path: str) -> None:
    migrate(database_path)

    with _connect(database_path) as db:
        rows = db.execute(
            """
            SELECT id, name, code, price_cents, created_at
            FROM products
            ORDER BY id ASC
            """
        ).fetchall()

        lines = ["BEGIN TRANSACTION;", "DELETE FROM products;"]
        for row in rows:
            values = ", ".join(_sql_literal(db, value) for value in row)
            lines.append(
                "INSERT INTO products (id, name, code, price_cents, created_at) "
                f"VALUES ({values});"
            )
        lines.extend(["COMMIT;", ""])

    SEED_SQL_PATH.parent.mkdir(parents=True, exist_ok=True)
    SEED_SQL_PATH.write_text("\n".join(lines), encoding="utf-8")


@contextmanager
def connect(database_path: str) -> Generator[sqlite3.Connection, None, None]:
    if database_path != ":memory:":
        Path(database_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(database_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


_connect = connect


def _migration_files() -> list[Path]:
    if not MIGRATIONS_DIR.exists():
        return []

    files: list[Path] = []
    for path in MIGRATIONS_DIR.iterdir():
        if path.is_file() and _is_migration_file(path.name):
            files.append(path)

    return sorted(files)


def _is_migration_file(file_name: str) -> bool:
    return (
        len(file_name) > 9
        and file_name[:4].isdigit()
        and file_name[4] == "_"
        and file_name.endswith(".sql")
    )


def _migration_is_applied(db: sqlite3.Connection, migration_name: str) -> bool:
    row = db.execute(
        "SELECT 1 FROM schema_migrations WHERE name = ?",
        (migration_name,),
    ).fetchone()
    return row is not None


def _next_migration_number() -> int:
    highest = 0
    for path in _migration_files():
        prefix = path.name.split("_", maxsplit=1)[0]
        highest = max(highest, int(prefix))
    return highest + 1


def _to_slug(name: str) -> str:
    return MIGRATION_SLUG_PATTERN.sub("_", name.lower()).strip("_")


def _sql_literal(db: sqlite3.Connection, value: object) -> str:
    row = db.execute("SELECT quote(?)", (value,)).fetchone()
    if row is None:
        raise RuntimeError("failed to quote SQL value")
    literal = row[0]
    if not isinstance(literal, str):
        raise RuntimeError("invalid SQL value")
    return literal


def _database_path_from_env() -> str:
    return os.environ.get("IOTBAY_DATABASE_PATH", str(DEFAULT_DB_PATH))


def main() -> int:
    if len(sys.argv) < 2:
        print(
            "Usage: python -m src.db [migrate|migration-new|seed-load|seed-dump] [name]"
        )
        return 1

    command = sys.argv[1]
    database_path = _database_path_from_env()

    if command == "migrate":
        migrate(database_path)
        print(f"Migrations applied for {database_path}")
        return 0

    if command == "migrate-new":
        if len(sys.argv) < 3:
            print("Usage: python -m src.db migrate-new <name>")
            return 1
        migration_path = create_migration(" ".join(sys.argv[2:]))
        print(f"Created {migration_path}")
        return 0

    if command == "seed-load":
        seed_apply(database_path)
        print(f"Applied shared data from {SEED_SQL_PATH}")
        return 0

    if command == "seed-dump":
        seed_save(database_path)
        print(f"Saved shared data to {SEED_SQL_PATH}")
        return 0

    print("Usage: python -m src.db [migrate|migrate-new|seed-load|seed-dump] [name]")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
