"""练习：出题与提交答案。"""

import json
import sqlite3

from . import wrong_book
from .grading import grade
from .questions import QuestionFilter, get_question, now_str, select_for_practice, to_practice_view

MAX_PRACTICE_SIZE = 200


def build_practice_set(
    conn: sqlite3.Connection,
    *,
    mode: str,
    flt: QuestionFilter,
    limit: int,
) -> list[dict]:
    limit = max(1, min(limit, MAX_PRACTICE_SIZE))
    if mode == "wrong_book":
        flt.ids = wrong_book.question_ids(conn)
        questions = select_for_practice(conn, flt, random=False, limit=limit)
        # 保持"最近做错优先"的顺序
        order = {qid: i for i, qid in enumerate(flt.ids)}
        questions.sort(key=lambda q: order.get(q["id"], 0))
    elif mode == "favorites":
        flt.favorite = True
        questions = select_for_practice(conn, flt, random=False, limit=limit)
    else:
        questions = select_for_practice(conn, flt, random=(mode == "random"), limit=limit)
    return [to_practice_view(q) for q in questions]


def submit_answer(
    conn: sqlite3.Connection,
    *,
    question_id: int,
    answer: list,
    mode: str = "sequential",
    at: str | None = None,
) -> dict:
    """判分、写入答题记录、维护错题本。返回带解析的结果。"""
    question = get_question(conn, question_id)  # NotFoundError
    result = grade(question, answer)  # GradingError
    ts = at or now_str()
    cur = conn.execute(
        "INSERT INTO attempts (question_id, user_answer, is_correct, mode, answered_at) VALUES (?, ?, ?, ?, ?)",
        (question_id, json.dumps(answer, ensure_ascii=False), 1 if result.is_correct else 0, mode, ts),
    )
    if not result.is_correct:
        wrong_book.record_wrong(conn, question_id, at=ts)
    elif mode == "wrong_book":
        # 错题重练答对后自动从错题本移除
        conn.execute("DELETE FROM wrong_book WHERE question_id = ?", (question_id,))
    conn.commit()
    return {
        "question_id": question_id,
        "is_correct": result.is_correct,
        "user_answer": answer,
        "correct_option_ids": result.correct_option_ids,
        "correct_answers": result.correct_answers,
        "explanation": question["explanation"],
        "in_wrong_book": wrong_book.contains(conn, question_id),
        "attempt_id": int(cur.lastrowid),
    }
