from pathlib import Path


def read_sql(module_file: str, *path_parts: str) -> str:
    return (
        Path(module_file)
        .resolve()
        .parent.joinpath(*path_parts)
        .read_text(encoding="utf-8")
        .strip()
    )
