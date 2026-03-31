import re
import sqlite3
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

from src.config import load_app_config

ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = ROOT_DIR / "data" / "iotbay.sqlite3"
MIGRATIONS_DIR = ROOT_DIR / "migrations"
SEED_SQL_PATH = ROOT_DIR / "db" / "seed.sql"


@dataclass(slots=True, frozen=True)
class SeedTable:
    name: str
    order_by: str


SEED_TABLES = (
    SeedTable(name="users", order_by="email ASC"),
    SeedTable(
        name="addresses",
        order_by="country ASC, state ASC, suburb ASC, address_line_one ASC",
    ),
    SeedTable(name="products", order_by="code ASC"),
)

MIGRATION_SLUG_PATTERN = re.compile(r"[^a-z0-9]+")


def migrate(database_path: str) -> None:
    with connect(database_path) as db:
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
    with connect(database_path) as db:
        db.executescript(script)


def seed_save(database_path: str) -> None:
    migrate(database_path)

    with connect(database_path) as db:
        lines = ["BEGIN TRANSACTION;"]
        for table in SEED_TABLES:
            lines.append(f"DELETE FROM {table.name};")

        for table in reversed(SEED_TABLES):
            lines.extend(
                _table_snapshot_lines(
                    db,
                    table.name,
                    order_by=table.order_by,
                )
            )

        lines.extend(["COMMIT;", ""])

    SEED_SQL_PATH.parent.mkdir(parents=True, exist_ok=True)
    SEED_SQL_PATH.write_text("\n".join(lines), encoding="utf-8")


@contextmanager
def connect(database_path: str) -> Iterator[sqlite3.Connection]:
    if database_path != ":memory:":
        Path(database_path).parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


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


def _table_snapshot_lines(
    db: sqlite3.Connection,
    table_name: str,
    *,
    order_by: str,
) -> list[str]:
    rows = db.execute(f"SELECT * FROM {table_name} ORDER BY {order_by}").fetchall()
    if not rows:
        return []

    description = db.execute(f"SELECT * FROM {table_name} LIMIT 0").description or ()
    column_names = [str(current[0]) for current in description]
    insert_columns = ", ".join(column_names)

    lines: list[str] = []
    for row in rows:
        values = ", ".join(
            _sql_literal(db, row[column_name]) for column_name in column_names
        )
        lines.append(f"INSERT INTO {table_name} ({insert_columns}) VALUES ({values});")

    return lines


def _database_path_from_config() -> str:
    return load_app_config().database_path


def main() -> int:
    if len(sys.argv) < 2:
        _print_usage()
        return 1

    return _run_command(
        sys.argv[1],
        _database_path_from_config(),
        sys.argv[2:],
    )


def _run_command(command: str, database_path: str, args: list[str]) -> int:
    if command == "migrate":
        migrate(database_path)
        print(f"Migrations applied for {database_path}")
        return 0

    if command == "migrate-new":
        if not args:
            print("Usage: python -m src.db migrate-new <name>")
            return 1
        migration_path = create_migration(" ".join(args))
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

    _print_usage()
    return 1


def _print_usage() -> None:
    print("Usage: python -m src.db [migrate|migrate-new|seed-load|seed-dump] [name]")


if __name__ == "__main__":
    raise SystemExit(main())
