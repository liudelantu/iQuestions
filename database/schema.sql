PRAGMA foreign_keys = ON;


-- 题库：保存用户导入的题库基本信息
CREATE TABLE question_banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- iQuestions 内部生成的题库 ID
    name TEXT NOT NULL, -- 题库名称
    description TEXT, -- 题库描述，可为空
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 最后修改时间
);


-- 题目：保存题目的基本信息
CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- iQuestions 内部生成的题目 ID
    source_id TEXT NOT NULL, -- 用户导入时提供的原始题目编号
    bank_id INTEGER NOT NULL, -- 所属题库 ID
    type TEXT NOT NULL, -- 题型：single=单选，multiple=多选，true_false=判断
    content TEXT NOT NULL, -- 题目内容
    explanation TEXT, -- 题目解析，可为空
    is_favorite INTEGER NOT NULL DEFAULT 0, -- 是否收藏：0=未收藏，1=已收藏
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 最后修改时间

    FOREIGN KEY (bank_id)
        REFERENCES question_banks(id)
        ON DELETE CASCADE,

    CHECK (type IN (
        'single',
        'multiple',
        'true_false'
    )),

    CHECK (is_favorite IN (0, 1)),

    UNIQUE (bank_id, source_id)
);


-- 选项：保存单选题、多选题和判断题的选项
CREATE TABLE options (
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
CREATE TABLE attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- iQuestions 内部生成的答题记录 ID
    question_id INTEGER NOT NULL, -- 所回答的题目 ID
    selected_options TEXT NOT NULL, -- 用户选择的 option ID，以 JSON 数组保存，例如 [12] 或 [12,15]
    is_correct INTEGER NOT NULL, -- 本次答题是否正确：0=错误，1=正确
    answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 答题时间
    note TEXT, -- 用户针对本次答题添加的笔记，可为空

    FOREIGN KEY (question_id)
        REFERENCES questions(id)
        ON DELETE CASCADE,

    CHECK (is_correct IN (0, 1))
);


-- 题库索引：提高按照题库查询题目的速度
CREATE INDEX idx_questions_bank_id
    ON questions(bank_id);


-- 题型索引：提高按照题型查询题目的速度
CREATE INDEX idx_questions_type
    ON questions(type);


-- 选项索引：提高按照题目查询选项的速度
CREATE INDEX idx_options_question_id
    ON options(question_id);


-- 答题记录索引：提高按照题目查询答题记录的速度
CREATE INDEX idx_attempts_question_id
    ON attempts(question_id);


-- 答题时间索引：提高按照答题时间查询历史记录的速度
CREATE INDEX idx_attempts_answered_at
    ON attempts(answered_at);