"""SQLite 连接管理与初始化。"""

import sqlite3
from collections.abc import Iterator
from pathlib import Path

from . import config

DEFAULT_BANK_NAME = "默认题库"


def connect(db_path: Path | str | None = None) -> sqlite3.Connection:
    path = Path(db_path) if db_path is not None else config.DB_PATH
    if str(path) != ":memory:":
        path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_schema(conn: sqlite3.Connection) -> None:
    """按 database/schema.sql 建表（幂等），并确保默认题库存在。"""
    conn.executescript(config.SCHEMA_PATH.read_text(encoding="utf-8"))
    row = conn.execute("SELECT id FROM question_banks ORDER BY id LIMIT 1").fetchone()
    if row is None:
        conn.execute(
            "INSERT INTO question_banks (name, description) VALUES (?, ?)",
            (DEFAULT_BANK_NAME, "系统自动创建的默认题库"),
        )
    conn.commit()


def default_bank_id(conn: sqlite3.Connection) -> int:
    row = conn.execute("SELECT id FROM question_banks ORDER BY id LIMIT 1").fetchone()
    if row is None:
        init_schema(conn)
        row = conn.execute("SELECT id FROM question_banks ORDER BY id LIMIT 1").fetchone()
    return int(row["id"])


def get_db() -> Iterator[sqlite3.Connection]:
    """FastAPI 依赖：每个请求一个连接。"""
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()
