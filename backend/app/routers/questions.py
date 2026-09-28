import sqlite3
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status

from ..db import get_db
from ..schemas import Difficulty, ImportResult, MetaOut, QuestionIn, QuestionOut, QuestionPage, QuestionType
from ..services import questions as svc

router = APIRouter(prefix="/api", tags=["题库管理"])

DB = Annotated[sqlite3.Connection, Depends(get_db)]
MAX_IMPORT = 1000


@router.get("/meta", response_model=MetaOut, summary="分类 / 标签 / 题型 / 难度汇总")
def get_meta(conn: DB):
    return svc.meta(conn)


@router.get("/questions", response_model=QuestionPage, summary="分页查询题目")
def list_questions(
    conn: DB,
    type: QuestionType | None = None,
    category: str | None = None,
    tag: str | None = None,
    difficulty: Difficulty | None = None,
    keyword: str | None = Query(default=None, max_length=200),
    favorite: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    order: str = Query(default="id", pattern="^(id|newest)$"),
):
    flt = svc.QuestionFilter(
        type=type, category=category, tag=tag, difficulty=difficulty, keyword=keyword, favorite=favorite
    )
    items, total = svc.list_questions(conn, flt, page=page, page_size=page_size, order=order)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED, summary="新增题目")
def create_question(conn: DB, payload: QuestionIn):
    try:
        return svc.create_question(conn, payload)
    except svc.ConflictError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e)) from e


@router.post("/questions/import", response_model=ImportResult, summary="JSON 批量导入")
def import_questions(conn: DB, items: Any = Body(...)):
    if isinstance(items, dict) and isinstance(items.get("questions"), list):
        items = items["questions"]
    if not isinstance(items, list):
        raise HTTPException(422, "请求体必须是题目数组，或 {\"questions\": [...]}")
    if not items:
        raise HTTPException(422, "题目数组不能为空")
    if len(items) > MAX_IMPORT:
        raise HTTPException(422, f"单次最多导入 {MAX_IMPORT} 道题目")
    return svc.import_questions(conn, items)


@router.get("/questions/{question_id}", response_model=QuestionOut, summary="题目详情（含答案与解析）")
def get_question(conn: DB, question_id: int):
    try:
        return svc.get_question(conn, question_id)
    except svc.NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e


@router.put("/questions/{question_id}", response_model=QuestionOut, summary="修改题目")
def update_question(conn: DB, question_id: int, payload: QuestionIn):
    try:
        return svc.update_question(conn, question_id, payload)
    except svc.NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
    except svc.ConflictError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e)) from e


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除题目")
def delete_question(conn: DB, question_id: int):
    try:
        svc.delete_question(conn, question_id)
    except svc.NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e


@router.put("/questions/{question_id}/favorite", response_model=QuestionOut, summary="收藏题目")
def favorite(conn: DB, question_id: int):
    try:
        return svc.set_favorite(conn, question_id, True)
    except svc.NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e


@router.delete("/questions/{question_id}/favorite", response_model=QuestionOut, summary="取消收藏")
def unfavorite(conn: DB, question_id: int):
    try:
        return svc.set_favorite(conn, question_id, False)
    except svc.NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
