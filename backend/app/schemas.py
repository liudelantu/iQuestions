"""请求 / 响应模型与输入校验。"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr, field_validator, model_validator

QuestionType = Literal["single", "multiple", "true_false", "fill_blank"]
Difficulty = Literal["easy", "medium", "hard"]
PracticeMode = Literal["sequential", "random", "wrong_book", "favorites"]

QUESTION_TYPE_LABELS: dict[str, str] = {
    "single": "单选题",
    "multiple": "多选题",
    "true_false": "判断题",
    "fill_blank": "填空题",
}
DIFFICULTY_LABELS: dict[str, str] = {"easy": "简单", "medium": "中等", "hard": "困难"}

MAX_OPTIONS = 10
MAX_TAGS = 10


def _clean_str_list(values: list[str], *, field: str, allow_empty_list: bool) -> list[str]:
    cleaned: list[str] = []
    for v in values:
        s = v.strip()
        if not s:
            raise ValueError(f"{field} 中不能包含空字符串")
        if s not in cleaned:
            cleaned.append(s)
    if not cleaned and not allow_empty_list:
        raise ValueError(f"{field} 不能为空")
    return cleaned


class OptionIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    content: str = Field(min_length=1, max_length=2000, description="选项内容")
    is_correct: bool = False


class QuestionIn(BaseModel):
    """新增 / 修改 / 导入题目时的请求体。"""

    model_config = ConfigDict(str_strip_whitespace=True)

    type: QuestionType
    title: str = Field(min_length=1, max_length=5000, description="题干")
    content: str | None = Field(default=None, max_length=20000, description="补充材料，可为空")
    options: list[OptionIn] = Field(default_factory=list, max_length=MAX_OPTIONS)
    fill_answers: list[list[str]] | None = Field(
        default=None, description="填空题答案，每个空一组可接受答案"
    )
    explanation: str | None = Field(default=None, max_length=20000)
    difficulty: Difficulty = "medium"
    category: str = Field(default="未分类", min_length=1, max_length=100)
    tags: list[str] = Field(default_factory=list, max_length=MAX_TAGS)
    source_id: str | None = Field(default=None, max_length=100)

    @field_validator("tags")
    @classmethod
    def _tags(cls, v: list[str]) -> list[str]:
        cleaned = _clean_str_list(v, field="标签", allow_empty_list=True)
        for t in cleaned:
            if len(t) > 50:
                raise ValueError("单个标签不能超过 50 个字符")
        return cleaned

    @field_validator("content", "explanation", "source_id", mode="before")
    @classmethod
    def _empty_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @model_validator(mode="after")
    def _check_by_type(self) -> "QuestionIn":
        if self.type == "fill_blank":
            if self.options:
                raise ValueError("填空题不应包含选项")
            if not self.fill_answers:
                raise ValueError("填空题至少需要一个空的答案")
            if len(self.fill_answers) > 20:
                raise ValueError("填空题最多支持 20 个空")
            self.fill_answers = [
                _clean_str_list(group, field=f"第 {i + 1} 个空的答案", allow_empty_list=False)
                for i, group in enumerate(self.fill_answers)
            ]
            return self

        self.fill_answers = None
        correct = sum(1 for o in self.options if o.is_correct)
        if self.type == "true_false":
            if len(self.options) != 2:
                raise ValueError("判断题必须恰好有 2 个选项")
            if correct != 1:
                raise ValueError("判断题必须恰好有 1 个正确选项")
        elif self.type == "single":
            if len(self.options) < 2:
                raise ValueError("单选题至少需要 2 个选项")
            if correct != 1:
                raise ValueError("单选题必须恰好有 1 个正确选项")
        elif self.type == "multiple":
            if len(self.options) < 2:
                raise ValueError("多选题至少需要 2 个选项")
            if correct < 1:
                raise ValueError("多选题至少需要 1 个正确选项")
        return self


class PracticeOptionOut(BaseModel):
    id: int
    label: str
    content: str


class OptionOut(PracticeOptionOut):
    is_correct: bool


class QuestionOut(BaseModel):
    id: int
    source_id: str | None
    type: QuestionType
    type_label: str
    title: str
    content: str | None
    explanation: str | None
    difficulty: Difficulty
    difficulty_label: str
    category: str
    tags: list[str]
    options: list[OptionOut]
    fill_answers: list[list[str]] | None
    is_favorite: bool
    attempt_count: int = 0
    wrong_count: int = 0
    created_at: str
    updated_at: str


class PracticeQuestionOut(BaseModel):
    """练习时下发的题目：不包含答案与解析。"""

    id: int
    type: QuestionType
    type_label: str
    title: str
    content: str | None
    difficulty: Difficulty
    difficulty_label: str
    category: str
    tags: list[str]
    options: list[PracticeOptionOut]
    blank_count: int
    is_favorite: bool


class QuestionPage(BaseModel):
    items: list[QuestionOut]
    total: int
    page: int
    page_size: int


class ImportResultItem(BaseModel):
    index: int
    error: str


class ImportResult(BaseModel):
    imported: int
    failed: list[ImportResultItem]
    ids: list[int]


class AnswerIn(BaseModel):
    question_id: int
    answer: list[StrictInt] | list[StrictStr] = Field(
        description="选择题为选项 ID 数组；填空题为按空顺序排列的字符串数组"
    )
    mode: PracticeMode = "sequential"


class AnswerResult(BaseModel):
    question_id: int
    is_correct: bool
    user_answer: list[int] | list[str]
    correct_option_ids: list[int]
    correct_answers: list[list[str]] | None
    explanation: str | None
    in_wrong_book: bool
    attempt_id: int


class WrongBookItem(BaseModel):
    question: QuestionOut
    wrong_count: int
    first_wrong_at: str
    last_wrong_at: str


class CategoryStat(BaseModel):
    category: str
    question_count: int
    attempts: int
    correct: int
    accuracy: float


class DayStat(BaseModel):
    date: str
    attempts: int
    correct: int
    accuracy: float


class StatsOverview(BaseModel):
    total_questions: int
    total_attempts: int
    correct_attempts: int
    accuracy: float
    answered_questions: int
    wrong_book_count: int
    favorite_count: int
    by_category: list[CategoryStat]
    last_7_days: list[DayStat]


class MetaOut(BaseModel):
    categories: list[dict]
    tags: list[dict]
    types: list[dict]
    difficulties: list[dict]
    total_questions: int
