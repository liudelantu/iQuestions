import os
from pathlib import Path

# 仓库根目录：backend/app/config.py -> backend/app -> backend -> 仓库根
REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO_ROOT / "database" / "schema.sql"
SEED_PATH = Path(__file__).resolve().parent / "seed_data.json"

# SQLite 文件默认落在项目目录 data/ 下，便于备份；可用环境变量覆盖
DB_PATH = Path(os.environ.get("IQUESTIONS_DB_PATH", REPO_ROOT / "data" / "iquestions.db"))

# 是否在数据库为空时自动写入示例题目（默认开启，设置为 0 关闭）
AUTO_SEED = os.environ.get("IQUESTIONS_AUTO_SEED", "1") != "0"

# 前端开发服务器地址（CORS 允许列表）
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "IQUESTIONS_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o.strip()
]
