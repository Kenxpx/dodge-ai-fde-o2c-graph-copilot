"""CLI entry point for rebuilding the local DuckDB database from the bundled dataset."""

from app.config import get_settings
from app.db import get_connection
from app.services.ingestion import build_database


def main() -> None:
    # This stays intentionally small so the local rebuild path is obvious to a
    # reviewer or teammate reading it for the first time.
    settings = get_settings()
    with get_connection(read_only=False) as connection:
        build_database(connection, settings.dataset_root)
    print(f"Database built at {settings.db_path}")


if __name__ == "__main__":
    main()
