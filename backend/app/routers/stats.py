import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends

from ..db import get_db
from ..schemas import StatsOverview
from ..services import stats as svc

router = APIRouter(prefix="/api/stats", tags=["统计"])

DB = Annotated[sqlite3.Connection, Depends(get_db)]


@router.get("/overview", response_model=StatsOverview, summary="统计总览")
def overview(conn: DB):
    return svc.overview(conn)
