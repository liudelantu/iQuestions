# iQuestions · 本地刷题系统

面向中国应试教育场景的通用刷题（在线练习题）系统 MVP。**只在自己电脑上运行、通过浏览器使用，无需登录、无多用户**，所有数据保存在项目目录下的一个 SQLite 文件中，复制该文件即可备份。

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 题库管理 | 题目增删改查；支持 **单选 / 多选 / 判断 / 填空** 四种题型；题目含题干、选项、答案、解析、难度、分类、标签；支持 **JSON 批量导入**（粘贴或选择文件） |
| 刷题模式 | 顺序练习、随机练习；可按 **题型 / 分类 / 标签 / 难度** 筛选；答题后 **即时判分并显示解析**；支持键盘 Enter 提交 / 下一题 |
| 错题本 | 做错的题目自动记录（含做错次数）；支持错题重练（答对后自动移出）与手动移除、清空 |
| 统计 | 总答题数、正确率、按分类的正确率、近 7 天答题趋势 |
| 收藏 | 刷题或浏览题库时一键收藏，可只练习收藏题 |
| 示例数据 | 预置 33 道示例题目（Python、数据结构、网络、数据库、操作系统、前端），覆盖四种题型，首次启动自动写入 |

## 技术栈

- 前端：React 19 + Vite + TypeScript + Tailwind CSS v4 + React Router
- 后端：Python 3.10+ / FastAPI + Pydantic v2（标准库 `sqlite3`，无 ORM）
- 数据库：SQLite（文件位于 `data/iquestions.db`）
- 测试：pytest（后端核心逻辑：判分、错题本、统计、API 校验）

## 快速开始（非开发者也可照做）

### 1. 安装前置软件（只需一次）

| 软件 | 版本要求 | 下载地址 | 检查是否安装成功 |
| --- | --- | --- | --- |
| Node.js | **20.19 及以上**（推荐 22 LTS） | <https://nodejs.org/> | 终端输入 `node -v`，显示 `v20.19.x` 或更高 |
| Python | **3.10 及以上** | <https://www.python.org/downloads/> | 终端输入 `python3 --version`（Windows 用 `python --version`） |

> Windows 安装 Python 时请勾选 **"Add python.exe to PATH"**。
> macOS / Linux 若创建虚拟环境失败，请安装 `python3-venv`（Ubuntu：`sudo apt install python3-venv`）。

### 2. 下载代码并安装依赖

```bash
git clone <本仓库地址> iQuestions
cd iQuestions
npm install
```

`npm install` 会自动完成：安装前端依赖、在项目目录创建 Python 虚拟环境 `.venv` 并安装后端依赖。

### 3. 一条命令启动

```bash
npm run dev
```

看到类似下面的输出后，用浏览器打开 **<http://localhost:5173>** 即可开始刷题：

```
[iquestions] 后端: http://127.0.0.1:8000  (API 文档 http://127.0.0.1:8000/docs)
[iquestions] 前端: http://localhost:5173  ← 在浏览器中打开这个地址开始刷题
```

按 `Ctrl + C` 停止。首次启动会自动创建数据库并写入 33 道示例题目。

### 其他常用命令

| 命令 | 作用 |
| --- | --- |
| `npm test` | 运行后端单元测试 + 前端类型检查与构建 |
| `npm run seed` | 数据库为空时写入示例题目；`npm run seed -- --force` 追加写入（已存在的 `source_id` 会跳过） |
| `npm run setup` | 重新安装依赖 |

### 使用 Docker Compose 启动（可选）

已安装 Docker 的用户可以不装 Node / Python：

```bash
docker compose up --build
```

同样访问 <http://localhost:5173>，数据库文件仍保存在宿主机的 `data/` 目录。

### 数据备份 / 重置

- 备份：复制 `data/iquestions.db` 文件即可。
- 重置：停止服务后删除 `data/iquestions.db`，再次启动会重新写入示例题目（如不想自动写入，启动前设置环境变量 `IQUESTIONS_AUTO_SEED=0`）。
- 自定义数据库位置：设置环境变量 `IQUESTIONS_DB_PATH=/你的/路径/xxx.db`。

## 目录结构

```
.
├── package.json            # 根脚本：npm install / npm run dev / npm test
├── scripts/run.mjs         # 一键安装、启动、测试脚本（Node 编写，零依赖）
├── docker-compose.yml
├── data/                   # SQLite 数据库文件（iquestions.db，已 gitignore）
├── database/
│   └── schema.sql          # 数据库表结构（题库、题目、选项、答题记录、错题本）
├── backend/
│   ├── requirements.txt / requirements-dev.txt
│   ├── Dockerfile
│   ├── pytest.ini
│   ├── app/
│   │   ├── main.py         # FastAPI 入口、CORS、统一错误处理
│   │   ├── config.py       # 路径与环境变量
│   │   ├── db.py           # SQLite 连接与初始化
│   │   ├── schemas.py      # Pydantic 请求/响应模型与输入校验
│   │   ├── seed.py / seed_data.json  # 示例题目
│   │   ├── routers/        # HTTP 路由：questions / practice / wrong_book / stats
│   │   └── services/       # 业务逻辑：grading（判分）/ questions / practice / wrong_book / stats
│   └── tests/              # pytest 单元测试
└── frontend/
    ├── vite.config.ts      # 开发服务器 + /api 代理到后端
    └── src/
        ├── api.ts          # 后端接口封装
        ├── types.ts        # 类型定义与中文标签
        ├── App.tsx         # 布局（桌面侧边栏 / 移动端底部导航）
        ├── components/     # PracticeSession、QuestionForm、QuestionItem、ImportModal、ui …
        └── pages/          # Dashboard（统计）/ Practice（刷题）/ Questions（题库）/ WrongBook / Favorites
```

## API 列表

启动后可在 <http://127.0.0.1:8000/docs> 查看交互式文档（Swagger UI）。所有接口前缀为 `/api`，返回 JSON；校验失败返回 `422 {"detail": "中文错误说明", ...}`，资源不存在返回 `404`，`source_id` 重复返回 `409`。

### 题库管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/meta` | 分类 / 标签 / 题型 / 难度汇总及数量 |
| GET | `/api/questions` | 分页查询。参数：`type` `category` `tag` `difficulty` `keyword` `favorite` `page` `page_size` `order=id\|newest` |
| POST | `/api/questions` | 新增题目（请求体见下） |
| GET | `/api/questions/{id}` | 题目详情（含答案与解析） |
| PUT | `/api/questions/{id}` | 修改题目（选项整体替换） |
| DELETE | `/api/questions/{id}` | 删除题目（级联删除选项、答题记录、错题记录） |
| POST | `/api/questions/import` | JSON 批量导入：请求体为题目数组或 `{"questions": [...]}`；逐条校验，返回 `{imported, failed:[{index,error}], ids}` |
| PUT | `/api/questions/{id}/favorite` | 收藏 |
| DELETE | `/api/questions/{id}/favorite` | 取消收藏 |

题目请求体示例：

```jsonc
{
  "type": "single",                 // single | multiple | true_false | fill_blank
  "title": "1 + 1 = ?",             // 题干（必填）
  "content": null,                  // 补充材料（可选）
  "options": [                      // 选择题选项；single/true_false 恰好 1 个正确，multiple ≥1 个正确
    { "content": "1" },
    { "content": "2", "is_correct": true }
  ],
  "fill_answers": null,             // 填空题：二维数组，每个空一组可接受答案，如 [["4","四"],["8"]]
  "explanation": "基础算术",
  "difficulty": "easy",             // easy | medium | hard
  "category": "数学",
  "tags": ["加法"],
  "source_id": "math-001"           // 可选，外部题号，需唯一
}
```

### 刷题

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/practice/questions` | 生成一组练习题（**不含答案与解析**）。参数：`mode=sequential\|random\|wrong_book\|favorites`、`type` `category` `tag` `difficulty`、`limit`（≤200） |
| POST | `/api/practice/answer` | 提交答案并即时判分。请求体 `{"question_id": 1, "answer": [12, 15], "mode": "sequential"}`；选择题 `answer` 为选项 ID 数组，填空题为按空顺序的字符串数组。返回 `is_correct`、`correct_option_ids`、`correct_answers`、`explanation`、`in_wrong_book` |

判分规则：单选 / 判断只允许选一个且必须正确；多选需与正确选项**完全一致**；填空忽略大小写、首尾及多余空白、全角/半角差异，每个空命中任一参考答案即可。

### 错题本

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/wrong-book` | 错题列表（最近做错优先，含做错次数），支持 `type` `category` `tag` `difficulty` 筛选 |
| DELETE | `/api/wrong-book/{question_id}` | 从错题本移除 |
| DELETE | `/api/wrong-book` | 清空错题本 |

规则：答错自动加入 / 累加次数；在 `mode=wrong_book` 下答对自动移出；其他模式答对不会自动移出。

### 统计

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/stats/overview` | `total_questions` `total_attempts` `correct_attempts` `accuracy` `answered_questions` `wrong_book_count` `favorite_count`、`by_category[]`（每分类题数 / 答题数 / 正确数 / 正确率）、`last_7_days[]`（按天答题数 / 正确数 / 正确率，缺失日期补 0） |

### 系统

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查，返回当前数据库文件路径 |

## 开发说明

```bash
# 仅后端
cd backend && python3 -m uvicorn app.main:app --reload --port 8000
python3 -m pytest -q          # 单元测试

# 仅前端（需后端已在 8000 端口运行）
cd frontend && npm run dev
npm run build                 # 类型检查 + 构建
npm run lint
```

环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `IQUESTIONS_DB_PATH` | `<项目>/data/iquestions.db` | SQLite 文件路径 |
| `IQUESTIONS_AUTO_SEED` | `1` | 数据库为空时是否自动写入示例题目 |
| `IQUESTIONS_CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | 允许的前端来源 |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:8000` | 前端开发服务器把 `/api` 代理到的后端地址 |
