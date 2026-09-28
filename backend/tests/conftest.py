import sqlite3

import pytest
from fastapi.testclient import TestClient

from app import db as dbmod
from app.main import app
from app.schemas import QuestionIn
from app.services.questions import create_question


@pytest.fixture()
def conn() -> sqlite3.Connection:
    """每个测试一个独立的内存数据库。"""
    c = dbmod.connect(":memory:")
    dbmod.init_schema(c)
    yield c
    c.close()


def make_single(conn, *, title="单选", category="分类A", difficulty="easy", tags=None, correct_index=0):
    payload = QuestionIn(
        type="single",
        title=title,
        options=[
            {"content": "A", "is_correct": correct_index == 0},
            {"content": "B", "is_correct": correct_index == 1},
            {"content": "C", "is_correct": correct_index == 2},
        ],
        explanation="解析",
        category=category,
        difficulty=difficulty,
        tags=tags or [],
    )
    return create_question(conn, payload)


def make_multiple(conn, *, title="多选", category="分类A"):
    payload = QuestionIn(
        type="multiple",
        title=title,
        options=[
            {"content": "A", "is_correct": True},
            {"content": "B", "is_correct": True},
            {"content": "C", "is_correct": False},
        ],
        category=category,
    )
    return create_question(conn, payload)


def make_fill(conn, *, title="填空", answers=None, category="分类B"):
    payload = QuestionIn(
        type="fill_blank",
        title=title,
        fill_answers=answers or [["lambda"], ["4", "四"]],
        category=category,
    )
    return create_question(conn, payload)


def correct_ids(q: dict) -> list[int]:
    return [o["id"] for o in q["options"] if o["is_correct"]]


def wrong_ids(q: dict) -> list[int]:
    return [o["id"] for o in q["options"] if not o["is_correct"]][:1]


@pytest.fixture()
def client(conn, monkeypatch):
    """使用同一个内存连接的 API 客户端；关闭自动种子。"""
    monkeypatch.setattr("app.main.config.AUTO_SEED", False)

    class _NoClose:
        def __init__(self, inner):
            self._inner = inner

        def __getattr__(self, name):
            return getattr(self._inner, name)

        def close(self):
            pass

    shared = _NoClose(conn)
    monkeypatch.setattr(dbmod, "connect", lambda *a, **k: shared)
    app.dependency_overrides[dbmod.get_db] = lambda: shared
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
