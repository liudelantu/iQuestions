PRAGMA foreign_keys = ON;


-- 题库：保存用户导入的题库基本信息
CREATE TABLE IF NOT EXISTS question_banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- iQuestions 内部生成的题库 ID
    name TEXT NOT NULL, -- 题库名称
    description TEXT, -- 题库描述，可为空
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 最后修改时间
);


-- 题目：保存题目的基本信息
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- iQuestions 内部生成的题目 ID
    source_id TEXT, -- 用户导入时提供的原始题目编号，可为空
    bank_id INTEGER NOT NULL, -- 所属题库 ID
    type TEXT NOT NULL, -- 题型：single=单选，multiple=多选，true_false=判断，fill_blank=填空
    title TEXT NOT NULL, -- 题目标题 / 题干
    content TEXT, -- 题目补充描述（可为空，例如材料、代码片段）
    explanation TEXT, -- 题目解析，可为空
    difficulty TEXT NOT NULL DEFAULT 'medium', -- 难度：easy=简单，medium=中等，hard=困难
    category TEXT NOT NULL DEFAULT '未分类', -- 分类（单值）
    tags TEXT NOT NULL DEFAULT '[]', -- 标签，JSON 字符串数组，例如 ["Python","基础"]
    fill_answers TEXT, -- 填空题答案：JSON 二维数组，每个空对应一组可接受答案，例如 [["4","四"],["8"]]
    is_favorite INTEGER NOT NULL DEFAULT 0, -- 是否收藏：0=未收藏，1=已收藏
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 最后修改时间

    FOREIGN KEY (bank_id)
        REFERENCES question_banks(id)
        ON DELETE CASCADE,

    CHECK (type IN (
        'single',
        'multiple',
        'true_false',
        'fill_blank'
    )),

    CHECK (difficulty IN ('easy', 'medium', 'hard')),

    CHECK (is_favorite IN (0, 1)),

    UNIQUE (bank_id, source_id)
);


-- 选项：保存单选题、多选题和判断题的选项
CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- iQuestions 内部生成的选项 ID
    question_id INTEGER NOT NULL, -- 所属题目 ID
    content TEXT NOT NULL, -- 选项内容
    is_correct INTEGER NOT NULL DEFAULT 0, -- 是否为正确选项：0=错误，1=正确
    sort_order INTEGER NOT NULL, -- 选项顺序，用于生成 A、B、C、D 等显示标签

    FOREIGN KEY (question_id)
        REFERENCES questions(id)
        ON DELETE CASCADE,

    CHECK (is_correct IN (0, 1)),

    UNIQUE (question_id, sort_order)
);


-- 答题记录：保存用户每一次答题的历史记录
CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- iQuestions 内部生成的答题记录 ID
    question_id INTEGER NOT NULL, -- 所回答的题目 ID
    user_answer TEXT NOT NULL, -- 用户答案，JSON：选择题为 option ID 数组，例如 [12,15]；填空题为字符串数组，例如 ["4","8"]
    is_correct INTEGER NOT NULL, -- 本次答题是否正确：0=错误，1=正确
    mode TEXT NOT NULL DEFAULT 'sequential', -- 答题模式：sequential / random / wrong_book / favorites
    answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 答题时间
    note TEXT, -- 用户针对本次答题添加的笔记，可为空

    FOREIGN KEY (question_id)
        REFERENCES questions(id)
        ON DELETE CASCADE,

    CHECK (is_correct IN (0, 1))
);


-- 错题本：做错的题目自动加入，可手动移除
CREATE TABLE IF NOT EXISTS wrong_book (
    question_id INTEGER PRIMARY KEY, -- 题目 ID
    wrong_count INTEGER NOT NULL DEFAULT 1, -- 累计做错次数
    first_wrong_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 首次做错时间
    last_wrong_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 最近一次做错时间

    FOREIGN KEY (question_id)
        REFERENCES questions(id)
        ON DELETE CASCADE
);


-- 题库索引：提高按照题库查询题目的速度
CREATE INDEX IF NOT EXISTS idx_questions_bank_id
    ON questions(bank_id);


-- 题型索引：提高按照题型查询题目的速度
CREATE INDEX IF NOT EXISTS idx_questions_type
    ON questions(type);


-- 分类 / 难度索引：提高筛选练习的速度
CREATE INDEX IF NOT EXISTS idx_questions_category
    ON questions(category);

CREATE INDEX IF NOT EXISTS idx_questions_difficulty
    ON questions(difficulty);


-- 选项索引：提高按照题目查询选项的速度
CREATE INDEX IF NOT EXISTS idx_options_question_id
    ON options(question_id);


-- 答题记录索引：提高按照题目查询答题记录的速度
CREATE INDEX IF NOT EXISTS idx_attempts_question_id
    ON attempts(question_id);


-- 答题时间索引：提高按照答题时间查询历史记录的速度
CREATE INDEX IF NOT EXISTS idx_attempts_answered_at
    ON attempts(answered_at);
