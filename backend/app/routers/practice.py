import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..db import get_db
from ..schemas import AnswerIn, AnswerResult, Difficulty, PracticeMode, PracticeQuestionOut, QuestionType
from ..services import practice as svc
from ..services.grading import GradingError
from ..services.questions import NotFoundError, QuestionFilter

router = APIRouter(prefix="/api/practice", tags=["刷题"])

DB = Annotated[sqlite3.Connection, Depends(get_db)]


@router.get("/questions", response_model=list[PracticeQuestionOut], summary="生成一组练习题（不含答案）")
def practice_questions(
    conn: DB,
    mode: PracticeMode = "sequential",
    type: QuestionType | None = None,
    category: str | None = None,
    tag: str | None = None,
    difficulty: Difficulty | None = None,
    limit: int = Query(default=20, ge=1, le=svc.MAX_PRACTICE_SIZE),
):
    flt = QuestionFilter(type=type, category=category, tag=tag, difficulty=difficulty)
    return svc.build_practice_set(conn, mode=mode, flt=flt, limit=limit)


@router.post("/answer", response_model=AnswerResult, summary="提交答案并即时判分")
def answer(conn: DB, payload: AnswerIn):
    try:
        return svc.submit_answer(conn, question_id=payload.question_id, answer=list(payload.answer), mode=payload.mode)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
    except GradingError as e:
        raise HTTPException(422, str(e)) from e
