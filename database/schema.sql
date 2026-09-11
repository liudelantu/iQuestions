PRAGMA foreign_keys = ON;


-- ============================================================
-- 1. 题库
-- 一个 iQuestions 数据库可以包含多套题库
-- ============================================================
CREATE TABLE question_banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- 题库唯一 ID

    name TEXT NOT NULL, -- 题库名称

    description TEXT, -- 题库描述，可为空

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 创建时间

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 最后修改时间
);


-- ============================================================
-- 2. 分类
-- 每个题库可以拥有自己的分类体系
--
-- parent_id:
--   NULL = 一级分类
--   非 NULL = 二级或三级分类
--
-- iQuestions V1 约定最多使用 3 层分类
-- ============================================================
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- 分类唯一 ID

    bank_id INTEGER NOT NULL, -- 所属题库 ID

    parent_id INTEGER, -- 父分类 ID；NULL 表示一级分类

    name TEXT NOT NULL, -- 分类名称

    sort_order INTEGER NOT NULL DEFAULT 0, -- 同级分类的显示顺序

    FOREIGN KEY (bank_id)
        REFERENCES question_banks(id)
        ON DELETE CASCADE,

    FOREIGN KEY (parent_id)
        REFERENCES categories(id)
        ON DELETE CASCADE,

    UNIQUE (bank_id, parent_id, name)
);


-- ============================================================
-- 3. 题目
-- ============================================================
CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- 题目唯一 ID

    bank_id INTEGER NOT NULL, -- 所属题库 ID

    category_id INTEGER, -- 所属分类 ID，可为空

    type TEXT NOT NULL, -- 题型：single=单选，multiple=多选，true_false=判断，fill_blank=填空，short_answer=简答

    content TEXT NOT NULL, -- 题目内容

    explanation TEXT, -- 题目解析，可为空；用户可以在界面中修改

    is_favorite INTEGER NOT NULL DEFAULT 0, -- 收藏状态：0=未收藏，1=已收藏

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 创建时间

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 最后修改时间

    FOREIGN KEY (bank_id)
        REFERENCES question_banks(id)
        ON DELETE CASCADE,

    FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL,

    CHECK (type IN (
        'single',
        'multiple',
        'true_false',
        'fill_blank',
        'short_answer'
    )),

    CHECK (is_favorite IN (0, 1))
);


-- ============================================================
-- 4. 选项
--
-- A、B、C、D 不存储在数据库中。
-- 页面根据 sort_order 动态生成 A、B、C、D。
--
-- 单选题：
--   只能有一个 is_correct = 1
--
-- 多选题：
--   可以有多个 is_correct = 1
--
-- 判断题：
--   可以使用两个选项，例如：
--   正确 / 错误
-- ============================================================
CREATE TABLE options (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- 选项唯一 ID

    question_id INTEGER NOT NULL, -- 所属题目 ID

    content TEXT NOT NULL, -- 选项内容

    is_correct INTEGER NOT NULL DEFAULT 0, -- 是否为正确选项：0=错误，1=正确

    sort_order INTEGER NOT NULL, -- 选项显示顺序；页面根据此字段生成 A、B、C、D 等标签

    FOREIGN KEY (question_id)
        REFERENCES questions(id)
        ON DELETE CASCADE,

    CHECK (is_correct IN (0, 1)),

    UNIQUE (question_id, sort_order)
);


-- ============================================================
-- 5. 答题记录
--
-- 每提交一次答案，就产生一条新的答题记录。
--
-- selected_options：
--   保存用户选择的 option.id
--   例如单选：[12]
--   例如多选：[12, 15]
--
-- user_answer：
--   用于填空题、简答题等文本答案
--
-- is_correct：
--   0 = 错误
--   1 = 正确
--
-- note：
--   用户针对本次答题填写的说明
--   例如："这道题把两个概念搞混了"
-- ============================================================
CREATE TABLE attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- 本次答题记录唯一 ID

    question_id INTEGER NOT NULL, -- 本次回答的题目 ID

    selected_options TEXT, -- 用户选择的选项 ID，以 JSON 数组保存，例如 [12] 或 [12,15]

    user_answer TEXT, -- 用户填写的答案，用于填空题、简答题等；选择题可为空

    is_correct INTEGER NOT NULL, -- 本次答题结果：0=错误，1=正确

    answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 本次答题时间

    note TEXT, -- 用户针对本次答题填写的说明，可为空

    FOREIGN KEY (question_id)
        REFERENCES questions(id)
        ON DELETE CASCADE,

    CHECK (is_correct IN (0, 1))
);


-- ============================================================
-- 6. 索引
-- 提高常用查询速度
-- ============================================================

-- 根据题库查询分类
CREATE INDEX idx_categories_bank_id
    ON categories(bank_id);

-- 根据父分类查询子分类
CREATE INDEX idx_categories_parent_id
    ON categories(parent_id);

-- 根据题库查询题目
CREATE INDEX idx_questions_bank_id
    ON questions(bank_id);

-- 根据分类查询题目
CREATE INDEX idx_questions_category_id
    ON questions(category_id);

-- 根据题型查询题目
CREATE INDEX idx_questions_type
    ON questions(type);

-- 根据题目查询选项
CREATE INDEX idx_options_question_id
    ON options(question_id);

-- 根据题目查询答题历史
CREATE INDEX idx_attempts_question_id
    ON attempts(question_id);

-- 根据时间查询答题历史
CREATE INDEX idx_attempts_answered_at
    ON attempts(answered_at);