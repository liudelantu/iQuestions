"""统计：总答题数、正确率、按分类正确率、近 7 天趋势。"""

import sqlite3
from datetime import date, datetime, timedelta

from . import wrong_book


def _accuracy(correct: int, total: int) -> float:
    return round(correct / total, 4) if total else 0.0


def overview(conn: sqlite3.Connection, *, today: date | None = None, days: int = 7) -> dict:
    today = today or datetime.now().date()

    total_questions = conn.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
    row = conn.execute(
        "SELECT COUNT(*) AS total, COALESCE(SUM(is_correct), 0) AS correct, "
        "COUNT(DISTINCT question_id) AS answered FROM attempts"
    ).fetchone()
    total_attempts, correct_attempts, answered = int(row["total"]), int(row["correct"]), int(row["answered"])

    by_category = [
        {
            "category": r["category"],
            "question_count": int(r["question_count"]),
            "attempts": int(r["attempts"]),
            "correct": int(r["correct"]),
            "accuracy": _accuracy(int(r["correct"]), int(r["attempts"])),
        }
        for r in conn.execute(
            """SELECT q.category,
                      COUNT(DISTINCT q.id) AS question_count,
                      COUNT(a.id) AS attempts,
                      COALESCE(SUM(a.is_correct), 0) AS correct
               FROM questions q LEFT JOIN attempts a ON a.question_id = q.id
               GROUP BY q.category
               ORDER BY attempts DESC, q.category"""
        )
    ]

    start = today - timedelta(days=days - 1)
    daily = {
        r["d"]: (int(r["attempts"]), int(r["correct"]))
        for r in conn.execute(
            """SELECT substr(answered_at, 1, 10) AS d, COUNT(*) AS attempts, COALESCE(SUM(is_correct), 0) AS correct
               FROM attempts WHERE substr(answered_at, 1, 10) >= ?
               GROUP BY d""",
            (start.isoformat(),),
        )
    }
    last_days = []
    for i in range(days):
        d = (start + timedelta(days=i)).isoformat()
        attempts, correct = daily.get(d, (0, 0))
        last_days.append({"date": d, "attempts": attempts, "correct": correct, "accuracy": _accuracy(correct, attempts)})

    favorite_count = conn.execute("SELECT COUNT(*) FROM questions WHERE is_favorite = 1").fetchone()[0]
    return {
        "total_questions": int(total_questions),
        "total_attempts": total_attempts,
        "correct_attempts": correct_attempts,
        "accuracy": _accuracy(correct_attempts, total_attempts),
        "answered_questions": answered,
        "wrong_book_count": wrong_book.count(conn),
        "favorite_count": int(favorite_count),
        "by_category": by_category,
        "last_7_days": last_days,
    }
