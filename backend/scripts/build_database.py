from app.config import get_settings
from app.db import get_connection
from app.services.ingestion import build_database


def main() -> None:
    settings = get_settings()
    with get_connection(read_only=False) as connection:
        build_database(connection, settings.dataset_root)
    print(f"Database built at {settings.db_path}")


if __name__ == "__main__":
    main()
