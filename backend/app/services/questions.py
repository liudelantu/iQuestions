"""题目的增删改查、筛选、导入与元数据。"""

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime

from pydantic import ValidationError

from ..db import default_bank_id
from ..schemas import DIFFICULTY_LABELS, QUESTION_TYPE_LABELS, QuestionIn

LABELS = "ABCDEFGHIJ"


class NotFoundError(LookupError):
    pass


class ConflictError(ValueError):
    pass


def format_validation_error(e: ValidationError) -> str:
    parts = []
    for err in e.errors():
        loc = ".".join(str(p) for p in err["loc"])
        msg = err["msg"].removeprefix("Value error, ")
        parts.append(f"{loc}: {msg}" if loc else msg)
    return "; ".join(parts)


def now_str() -> str:
    return datetime.now().isoformat(sep=" ", timespec="seconds")


@dataclass
class QuestionFilter:
    type: str | None = None
    category: str | None = None
    tag: str | None = None
    difficulty: str | None = None
    keyword: str | None = None
    favorite: bool | None = None
    ids: list[int] | None = None

    def where(self) -> tuple[str, list]:
        clauses: list[str] = []
        params: list = []
        if self.type:
            clauses.append("q.type = ?")
            params.append(self.type)
        if self.category:
            clauses.append("q.category = ?")
            params.append(self.category)
        if self.difficulty:
            clauses.append("q.difficulty = ?")
            params.append(self.difficulty)
        if self.tag:
            clauses.append("EXISTS (SELECT 1 FROM json_each(q.tags) je WHERE je.value = ?)")
            params.append(self.tag)
        if self.keyword:
            clauses.append("(q.title LIKE ? OR q.content LIKE ? OR q.explanation LIKE ?)")
            like = f"%{self.keyword}%"
            params.extend([like, like, like])
        if self.favorite is not None:
            clauses.append("q.is_favorite = ?")
            params.append(1 if self.favorite else 0)
        if self.ids is not None:
            if not self.ids:
                clauses.append("0")
            else:
                clauses.append(f"q.id IN ({','.join('?' * len(self.ids))})")
                params.extend(self.ids)
        return (" WHERE " + " AND ".join(clauses)) if clauses else "", params


_BASE_SELECT = """
SELECT q.*,
       (SELECT COUNT(*) FROM attempts a WHERE a.question_id = q.id) AS attempt_count,
       (SELECT COUNT(*) FROM attempts a WHERE a.question_id = q.id AND a.is_correct = 0) AS wrong_count
FROM questions q
"""


def _row_to_question(row: sqlite3.Row, options: list[sqlite3.Row]) -> dict:
    fill = row["fill_answers"]
    return {
        "id": row["id"],
        "source_id": row["source_id"],
        "type": row["type"],
        "type_label": QUESTION_TYPE_LABELS.get(row["type"], row["type"]),
        "title": row["title"],
        "content": row["content"],
        "explanation": row["explanation"],
        "difficulty": row["difficulty"],
        "difficulty_label": DIFFICULTY_LABELS.get(row["difficulty"], row["difficulty"]),
        "category": row["category"],
        "tags": json.loads(row["tags"] or "[]"),
        "options": [
            {
                "id": o["id"],
                "label": LABELS[i] if i < len(LABELS) else str(i + 1),
                "content": o["content"],
                "is_correct": bool(o["is_correct"]),
            }
            for i, o in enumerate(options)
        ],
        "fill_answers": json.loads(fill) if fill else None,
        "is_favorite": bool(row["is_favorite"]),
        "attempt_count": row["attempt_count"] if "attempt_count" in row.keys() else 0,
        "wrong_count": row["wrong_count"] if "wrong_count" in row.keys() else 0,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _attach_options(conn: sqlite3.Connection, rows: list[sqlite3.Row]) -> list[dict]:
    if not rows:
        return []
    ids = [r["id"] for r in rows]
    by_q: dict[int, list[sqlite3.Row]] = {i: [] for i in ids}
    # SQLite 默认最多 999 个变量，分块查询
    for start in range(0, len(ids), 500):
        chunk = ids[start : start + 500]
        for o in conn.execute(
            f"SELECT * FROM options WHERE question_id IN ({','.join('?' * len(chunk))}) "
            "ORDER BY question_id, sort_order",
            chunk,
        ):
            by_q[o["question_id"]].append(o)
    return [_row_to_question(r, by_q[r["id"]]) for r in rows]


def to_practice_view(q: dict) -> dict:
    """去掉答案与解析，供练习时下发。"""
    return {
        "id": q["id"],
        "type": q["type"],
        "type_label": q["type_label"],
        "title": q["title"],
        "content": q["content"],
        "difficulty": q["difficulty"],
        "difficulty_label": q["difficulty_label"],
        "category": q["category"],
        "tags": q["tags"],
        "options": [{"id": o["id"], "label": o["label"], "content": o["content"]} for o in q["options"]],
        "blank_count": len(q["fill_answers"] or []) if q["type"] == "fill_blank" else 0,
        "is_favorite": q["is_favorite"],
    }


def list_questions(
    conn: sqlite3.Connection,
    flt: QuestionFilter,
    *,
    page: int = 1,
    page_size: int = 20,
    order: str = "id",
) -> tuple[list[dict], int]:
    where, params = flt.where()
    total = conn.execute(f"SELECT COUNT(*) FROM questions q{where}", params).fetchone()[0]
    order_sql = {"id": "q.id ASC", "newest": "q.id DESC", "random": "RANDOM()"}.get(order, "q.id ASC")
    rows = conn.execute(
        f"{_BASE_SELECT}{where} ORDER BY {order_sql} LIMIT ? OFFSET ?",
        [*params, page_size, (page - 1) * page_size],
    ).fetchall()
    return _attach_options(conn, rows), int(total)


def select_for_practice(conn: sqlite3.Connection, flt: QuestionFilter, *, random: bool, limit: int) -> list[dict]:
    where, params = flt.where()
    order_sql = "RANDOM()" if random else "q.id ASC"
    rows = conn.execute(f"{_BASE_SELECT}{where} ORDER BY {order_sql} LIMIT ?", [*params, limit]).fetchall()
    return _attach_options(conn, rows)


def get_question(conn: sqlite3.Connection, question_id: int) -> dict:
    row = conn.execute(f"{_BASE_SELECT} WHERE q.id = ?", (question_id,)).fetchone()
    if row is None:
        raise NotFoundError(f"题目 {question_id} 不存在")
    return _attach_options(conn, [row])[0]


def _insert_options(conn: sqlite3.Connection, question_id: int, payload: QuestionIn) -> None:
    conn.executemany(
        "INSERT INTO options (question_id, content, is_correct, sort_order) VALUES (?, ?, ?, ?)",
        [(question_id, o.content, 1 if o.is_correct else 0, i) for i, o in enumerate(payload.options)],
    )


def create_question(conn: sqlite3.Connection, payload: QuestionIn, *, commit: bool = True) -> dict:
    bank_id = default_bank_id(conn)
    ts = now_str()
    try:
        cur = conn.execute(
            """INSERT INTO questions
               (source_id, bank_id, type, title, content, explanation, difficulty, category, tags,
                fill_answers, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                payload.source_id,
                bank_id,
                payload.type,
                payload.title,
                payload.content,
                payload.explanation,
                payload.difficulty,
                payload.category,
                json.dumps(payload.tags, ensure_ascii=False),
                json.dumps(payload.fill_answers, ensure_ascii=False) if payload.fill_answers else None,
                ts,
                ts,
            ),
        )
    except sqlite3.IntegrityError as e:
        raise ConflictError(f"source_id '{payload.source_id}' 已存在") from e
    qid = int(cur.lastrowid)
    _insert_options(conn, qid, payload)
    if commit:
        conn.commit()
    return get_question(conn, qid)


def update_question(conn: sqlite3.Connection, question_id: int, payload: QuestionIn) -> dict:
    get_question(conn, question_id)  # 不存在则抛 NotFoundError
    try:
        conn.execute(
            """UPDATE questions SET source_id = ?, type = ?, title = ?, content = ?, explanation = ?,
               difficulty = ?, category = ?, tags = ?, fill_answers = ?, updated_at = ?
               WHERE id = ?""",
            (
                payload.source_id,
                payload.type,
                payload.title,
                payload.content,
                payload.explanation,
                payload.difficulty,
                payload.category,
                json.dumps(payload.tags, ensure_ascii=False),
                json.dumps(payload.fill_answers, ensure_ascii=False) if payload.fill_answers else None,
                now_str(),
                question_id,
            ),
        )
    except sqlite3.IntegrityError as e:
        conn.rollback()
        raise ConflictError(f"source_id '{payload.source_id}' 已存在") from e
    # 选项整体替换（历史答题记录中的 option ID 仅用于回显，不影响统计）
    conn.execute("DELETE FROM options WHERE question_id = ?", (question_id,))
    _insert_options(conn, question_id, payload)
    conn.commit()
    return get_question(conn, question_id)


def delete_question(conn: sqlite3.Connection, question_id: int) -> None:
    cur = conn.execute("DELETE FROM questions WHERE id = ?", (question_id,))
    if cur.rowcount == 0:
        raise NotFoundError(f"题目 {question_id} 不存在")
    conn.commit()


def import_questions(conn: sqlite3.Connection, items: list) -> dict:
    """批量导入：逐条校验，单条失败不影响其他题目。"""
    imported_ids: list[int] = []
    failed: list[dict] = []
    for idx, raw in enumerate(items):
        try:
            payload = QuestionIn.model_validate(raw)
            q = create_question(conn, payload, commit=False)
            imported_ids.append(q["id"])
        except ValidationError as e:
            failed.append({"index": idx, "error": format_validation_error(e)})
        except ConflictError as e:
            failed.append({"index": idx, "error": str(e)})
    conn.commit()
    return {"imported": len(imported_ids), "failed": failed, "ids": imported_ids}


def set_favorite(conn: sqlite3.Connection, question_id: int, favorite: bool) -> dict:
    cur = conn.execute(
        "UPDATE questions SET is_favorite = ?, updated_at = ? WHERE id = ?",
        (1 if favorite else 0, now_str(), question_id),
    )
    if cur.rowcount == 0:
        raise NotFoundError(f"题目 {question_id} 不存在")
    conn.commit()
    return get_question(conn, question_id)


def meta(conn: sqlite3.Connection) -> dict:
    categories = [
        {"name": r["category"], "count": r["c"]}
        for r in conn.execute("SELECT category, COUNT(*) c FROM questions GROUP BY category ORDER BY c DESC, category")
    ]
    tags = [
        {"name": r["tag"], "count": r["c"]}
        for r in conn.execute(
            "SELECT je.value AS tag, COUNT(*) c FROM questions q, json_each(q.tags) je GROUP BY je.value ORDER BY c DESC, tag"
        )
    ]
    type_counts = {r["type"]: r["c"] for r in conn.execute("SELECT type, COUNT(*) c FROM questions GROUP BY type")}
    diff_counts = {
        r["difficulty"]: r["c"] for r in conn.execute("SELECT difficulty, COUNT(*) c FROM questions GROUP BY difficulty")
    }
    total = conn.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
    return {
        "categories": categories,
        "tags": tags,
        "types": [{"value": k, "label": v, "count": type_counts.get(k, 0)} for k, v in QUESTION_TYPE_LABELS.items()],
        "difficulties": [
            {"value": k, "label": v, "count": diff_counts.get(k, 0)} for k, v in DIFFICULTY_LABELS.items()
        ],
        "total_questions": int(total),
    }
