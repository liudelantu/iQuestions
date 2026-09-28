from datetime import date

from app.services.practice import submit_answer
from app.services.questions import set_favorite
from app.services.stats import overview

from .conftest import correct_ids, make_fill, make_single, wrong_ids


def test_empty_stats(conn):
    s = overview(conn, today=date(2026, 9, 28))
    assert s["total_questions"] == 0
    assert s["total_attempts"] == 0
    assert s["accuracy"] == 0.0
    assert s["by_category"] == []
    assert len(s["last_7_days"]) == 7
    assert s["last_7_days"][0]["date"] == "2026-09-22"
    assert s["last_7_days"][-1]["date"] == "2026-09-28"
    assert all(d["attempts"] == 0 for d in s["last_7_days"])


def test_overview_counts_and_accuracy(conn):
    a1 = make_single(conn, category="分类A")
    a2 = make_single(conn, category="分类A")
    b1 = make_fill(conn, category="分类B")
    make_single(conn, category="分类C")  # 从未作答

    today = "2026-09-28"
    submit_answer(conn, question_id=a1["id"], answer=correct_ids(a1), at=f"{today} 09:00:00")
    submit_answer(conn, question_id=a1["id"], answer=wrong_ids(a1), at=f"{today} 09:05:00")
    submit_answer(conn, question_id=a2["id"], answer=correct_ids(a2), at=f"{today} 09:10:00")
    submit_answer(conn, question_id=b1["id"], answer=["lambda", "4"], at="2026-09-27 20:00:00")
    submit_answer(conn, question_id=b1["id"], answer=["x", "y"], at="2026-09-20 20:00:00")  # 超出 7 天窗口
    set_favorite(conn, a2["id"], True)

    s = overview(conn, today=date(2026, 9, 28))
    assert s["total_questions"] == 4
    assert s["total_attempts"] == 5
    assert s["correct_attempts"] == 3
    assert s["accuracy"] == 0.6
    assert s["answered_questions"] == 3
    assert s["wrong_book_count"] == 2
    assert s["favorite_count"] == 1

    by_cat = {c["category"]: c for c in s["by_category"]}
    assert by_cat["分类A"]["attempts"] == 3
    assert by_cat["分类A"]["correct"] == 2
    assert by_cat["分类A"]["accuracy"] == round(2 / 3, 4)
    assert by_cat["分类A"]["question_count"] == 2
    assert by_cat["分类B"] == {"category": "分类B", "question_count": 1, "attempts": 2, "correct": 1, "accuracy": 0.5}
    assert by_cat["分类C"]["attempts"] == 0 and by_cat["分类C"]["accuracy"] == 0.0

    days = {d["date"]: d for d in s["last_7_days"]}
    assert len(days) == 7
    assert days["2026-09-28"] == {"date": "2026-09-28", "attempts": 3, "correct": 2, "accuracy": round(2 / 3, 4)}
    assert days["2026-09-27"] == {"date": "2026-09-27", "attempts": 1, "correct": 1, "accuracy": 1.0}
    assert days["2026-09-22"]["attempts"] == 0
    assert "2026-09-20" not in days


def test_trend_window_boundaries(conn):
    q = make_single(conn)
    submit_answer(conn, question_id=q["id"], answer=correct_ids(q), at="2026-09-22 00:00:01")  # 窗口第一天
    submit_answer(conn, question_id=q["id"], answer=correct_ids(q), at="2026-09-21 23:59:59")  # 窗口前一天
    s = overview(conn, today=date(2026, 9, 28))
    assert sum(d["attempts"] for d in s["last_7_days"]) == 1
    assert s["last_7_days"][0] == {"date": "2026-09-22", "attempts": 1, "correct": 1, "accuracy": 1.0}
