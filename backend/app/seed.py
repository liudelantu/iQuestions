"""示例题目种子数据。

用法：
    python -m app.seed            # 数据库为空时写入示例题目
    python -m app.seed --force    # 追加写入（已存在的 source_id 会被跳过）
"""

import json
import sqlite3
import sys

from . import config, db
from .services.questions import import_questions


def load_seed_items() -> list[dict]:
    return json.loads(config.SEED_PATH.read_text(encoding="utf-8"))


def seed_if_empty(conn: sqlite3.Connection) -> int:
    count = conn.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
    if count:
        return 0
    return seed(conn)


def seed(conn: sqlite3.Connection) -> int:
    result = import_questions(conn, load_seed_items())
    for f in result["failed"]:
        print(f"[seed] 第 {f['index']} 条导入失败: {f['error']}", file=sys.stderr)
    return result["imported"]


def main(argv: list[str]) -> int:
    conn = db.connect()
    try:
        db.init_schema(conn)
        n = seed(conn) if "--force" in argv else seed_if_empty(conn)
        print(f"[seed] 已写入 {n} 道示例题目 -> {config.DB_PATH}")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
