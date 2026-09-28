"""iQuestions 后端入口。"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config, db
from .routers import practice, questions, stats, wrong_book
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(_: FastAPI):
    conn = db.connect()
    try:
        db.init_schema(conn)
        if config.AUTO_SEED:
            seed_if_empty(conn)
    finally:
        conn.close()
    yield


app = FastAPI(
    title="iQuestions API",
    description="本地单用户刷题系统后端",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError):
    """把 pydantic 的校验错误整理成前端易读的 detail 字符串。"""
    messages = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err.get("loc", []) if p not in ("body", "query", "path"))
        msg = err.get("msg", "")
        if msg.startswith("Value error, "):
            msg = msg[len("Value error, "):]
        messages.append(f"{loc}: {msg}" if loc else msg)
    return JSONResponse(
        status_code=422, content={"detail": "; ".join(messages), "errors": jsonable_encoder(exc.errors())}
    )


@app.get("/api/health", tags=["系统"], summary="健康检查")
def health():
    return {"status": "ok", "db_path": str(config.DB_PATH)}


app.include_router(questions.router)
app.include_router(practice.router)
app.include_router(wrong_book.router)
app.include_router(stats.router)
