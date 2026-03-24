from contextlib import contextmanager
from typing import Iterator

import duckdb

from app.config import get_settings


@contextmanager
def get_connection(read_only: bool = True) -> Iterator[duckdb.DuckDBPyConnection]:
    settings = get_settings()
    connection = duckdb.connect(str(settings.db_path), read_only=read_only)
    connection.execute("PRAGMA threads=4")
    try:
        yield connection
    finally:
        connection.close()
