import pytest

from app.services import wrong_book
from app.services.practice import build_practice_set, submit_answer
from app.services.questions import NotFoundError, QuestionFilter

from .conftest import correct_ids, make_fill, make_single, wrong_ids


def test_wrong_answer_adds_to_wrong_book(conn):
    q = make_single(conn)
    r = submit_answer(conn, question_id=q["id"], answer=wrong_ids(q))
    assert r["is_correct"] is False
    assert r["in_wrong_book"] is True
    assert r["correct_option_ids"] == correct_ids(q)
    assert r["explanation"] == "解析"
    items = wrong_book.list_items(conn)
    assert [i["question"]["id"] for i in items] == [q["id"]]
    assert items[0]["wrong_count"] == 1


def test_correct_answer_does_not_add(conn):
    q = make_single(conn)
    r = submit_answer(conn, question_id=q["id"], answer=correct_ids(q))
    assert r["is_correct"] and not r["in_wrong_book"]
    assert wrong_book.count(conn) == 0


def test_repeated_wrong_increments_count_and_reorders(conn):
    q1 = make_single(conn, title="q1")
    q2 = make_single(conn, title="q2")
    submit_answer(conn, question_id=q1["id"], answer=wrong_ids(q1), at="2026-01-01 10:00:00")
    submit_answer(conn, question_id=q2["id"], answer=wrong_ids(q2), at="2026-01-01 11:00:00")
    submit_answer(conn, question_id=q1["id"], answer=wrong_ids(q1), at="2026-01-01 12:00:00")

    items = wrong_book.list_items(conn)
    assert [i["question"]["id"] for i in items] == [q1["id"], q2["id"]], "最近做错的排在前面"
    assert items[0]["wrong_count"] == 2
    assert items[0]["first_wrong_at"] == "2026-01-01 10:00:00"
    assert items[0]["last_wrong_at"] == "2026-01-01 12:00:00"
    assert wrong_book.count(conn) == 2


def test_correct_in_normal_mode_keeps_in_wrong_book(conn):
    q = make_single(conn)
    submit_answer(conn, question_id=q["id"], answer=wrong_ids(q))
    r = submit_answer(conn, question_id=q["id"], answer=correct_ids(q), mode="sequential")
    assert r["is_correct"] and r["in_wrong_book"] is True


def test_correct_in_wrong_book_mode_removes(conn):
    q = make_single(conn)
    submit_answer(conn, question_id=q["id"], answer=wrong_ids(q))
    r = submit_answer(conn, question_id=q["id"], answer=correct_ids(q), mode="wrong_book")
    assert r["is_correct"] and r["in_wrong_book"] is False
    assert wrong_book.count(conn) == 0


def test_remove_and_clear(conn):
    q1 = make_single(conn)
    q2 = make_fill(conn)
    submit_answer(conn, question_id=q1["id"], answer=wrong_ids(q1))
    submit_answer(conn, question_id=q2["id"], answer=["nope", "nope"])
    wrong_book.remove(conn, q1["id"])
    assert wrong_book.question_ids(conn) == [q2["id"]]
    with pytest.raises(NotFoundError):
        wrong_book.remove(conn, q1["id"])
    assert wrong_book.clear(conn) == 1
    assert wrong_book.count(conn) == 0


def test_wrong_book_practice_set_strips_answers(conn):
    q1 = make_single(conn, title="q1")
    q2 = make_single(conn, title="q2")
    make_single(conn, title="q3")
    submit_answer(conn, question_id=q1["id"], answer=wrong_ids(q1), at="2026-01-01 10:00:00")
    submit_answer(conn, question_id=q2["id"], answer=wrong_ids(q2), at="2026-01-01 11:00:00")

    practice = build_practice_set(conn, mode="wrong_book", flt=QuestionFilter(), limit=50)
    assert [p["id"] for p in practice] == [q2["id"], q1["id"]]
    for p in practice:
        assert "explanation" not in p and "fill_answers" not in p
        assert all("is_correct" not in o for o in p["options"])


def test_deleting_question_removes_from_wrong_book(conn):
    q = make_single(conn)
    submit_answer(conn, question_id=q["id"], answer=wrong_ids(q))
    conn.execute("DELETE FROM questions WHERE id = ?", (q["id"],))
    conn.commit()
    assert wrong_book.count(conn) == 0
