"""错题本：做错自动加入，做对不自动移除（由用户手动移除或重练后移除）。"""

import sqlite3

from .questions import NotFoundError, QuestionFilter, _attach_options, now_str


def record_wrong(conn: sqlite3.Connection, question_id: int, *, at: str | None = None) -> None:
    ts = at or now_str()
    conn.execute(
        """INSERT INTO wrong_book (question_id, wrong_count, first_wrong_at, last_wrong_at)
           VALUES (?, 1, ?, ?)
           ON CONFLICT(question_id) DO UPDATE SET
               wrong_count = wrong_count + 1,
               last_wrong_at = excluded.last_wrong_at""",
        (question_id, ts, ts),
    )


def contains(conn: sqlite3.Connection, question_id: int) -> bool:
    return conn.execute("SELECT 1 FROM wrong_book WHERE question_id = ?", (question_id,)).fetchone() is not None


def remove(conn: sqlite3.Connection, question_id: int) -> None:
    cur = conn.execute("DELETE FROM wrong_book WHERE question_id = ?", (question_id,))
    if cur.rowcount == 0:
        raise NotFoundError(f"题目 {question_id} 不在错题本中")
    conn.commit()


def clear(conn: sqlite3.Connection) -> int:
    cur = conn.execute("DELETE FROM wrong_book")
    conn.commit()
    return cur.rowcount


def count(conn: sqlite3.Connection) -> int:
    return int(conn.execute("SELECT COUNT(*) FROM wrong_book").fetchone()[0])


def list_items(conn: sqlite3.Connection, flt: QuestionFilter | None = None) -> list[dict]:
    where, params = (flt or QuestionFilter()).where()
    where = (where + " AND " if where else " WHERE ") + "w.question_id IS NOT NULL"
    rows = conn.execute(
        f"""SELECT q.*, w.wrong_count AS wb_wrong_count, w.first_wrong_at, w.last_wrong_at,
                   (SELECT COUNT(*) FROM attempts a WHERE a.question_id = q.id) AS attempt_count,
                   (SELECT COUNT(*) FROM attempts a WHERE a.question_id = q.id AND a.is_correct = 0) AS wrong_count
            FROM questions q JOIN wrong_book w ON w.question_id = q.id
            {where}
            ORDER BY w.last_wrong_at DESC, q.id DESC""",
        params,
    ).fetchall()
    questions = _attach_options(conn, rows)
    return [
        {
            "question": q,
            "wrong_count": r["wb_wrong_count"],
            "first_wrong_at": r["first_wrong_at"],
            "last_wrong_at": r["last_wrong_at"],
        }
        for q, r in zip(questions, rows)
    ]


def question_ids(conn: sqlite3.Connection) -> list[int]:
    return [r["question_id"] for r in conn.execute("SELECT question_id FROM wrong_book ORDER BY last_wrong_at DESC")]
