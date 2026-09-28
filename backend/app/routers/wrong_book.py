import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_db
from ..schemas import Difficulty, QuestionType, WrongBookItem
from ..services import wrong_book as svc
from ..services.questions import NotFoundError, QuestionFilter

router = APIRouter(prefix="/api/wrong-book", tags=["错题本"])

DB = Annotated[sqlite3.Connection, Depends(get_db)]


@router.get("", response_model=list[WrongBookItem], summary="错题列表（最近做错优先）")
def list_wrong(
    conn: DB,
    type: QuestionType | None = None,
    category: str | None = None,
    tag: str | None = None,
    difficulty: Difficulty | None = None,
):
    return svc.list_items(conn, QuestionFilter(type=type, category=category, tag=tag, difficulty=difficulty))


@router.delete("", summary="清空错题本")
def clear_wrong(conn: DB):
    return {"removed": svc.clear(conn)}


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT, summary="从错题本移除")
def remove_wrong(conn: DB, question_id: int):
    try:
        svc.remove(conn, question_id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
