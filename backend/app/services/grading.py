"""判分核心逻辑：纯函数，不依赖数据库。"""

import re
import unicodedata
from dataclasses import dataclass, field


class GradingError(ValueError):
    """用户答案格式与题型不匹配。"""


@dataclass
class GradeResult:
    is_correct: bool
    correct_option_ids: list[int] = field(default_factory=list)
    correct_answers: list[list[str]] | None = None


_WS = re.compile(r"\s+")


def normalize_text(s: str) -> str:
    """填空题文本归一化：NFKC（全角→半角）、去首尾空白、压缩内部空白、忽略大小写。"""
    s = unicodedata.normalize("NFKC", s)
    s = _WS.sub(" ", s.strip())
    return s.casefold()


def grade_choice(correct_option_ids: set[int], selected_option_ids: list[int], *, single: bool) -> bool:
    """选择题判分：多选需完全一致，单选/判断只允许选择一个。"""
    selected = set(selected_option_ids)
    if not selected:
        return False
    if single and len(selected) != 1:
        return False
    return selected == set(correct_option_ids)


def grade_fill(fill_answers: list[list[str]], user_answers: list[str]) -> bool:
    """填空题判分：每个空的用户答案需命中该空的任一可接受答案。"""
    if len(user_answers) != len(fill_answers):
        return False
    for accepted, given in zip(fill_answers, user_answers):
        if normalize_text(given) not in {normalize_text(a) for a in accepted}:
            return False
    return True


def grade(question: dict, answer: list) -> GradeResult:
    """按题型判分。

    question 需要包含 type、options（含 id / is_correct）、fill_answers。
    answer 为选项 ID 列表（选择题）或字符串列表（填空题）。
    """
    qtype = question["type"]
    if qtype == "fill_blank":
        fill_answers = question.get("fill_answers") or []
        if not all(isinstance(a, str) for a in answer):
            raise GradingError("填空题答案必须是字符串数组")
        return GradeResult(
            is_correct=grade_fill(fill_answers, list(answer)),
            correct_answers=fill_answers,
        )

    if not all(isinstance(a, int) and not isinstance(a, bool) for a in answer):
        raise GradingError("选择题答案必须是选项 ID 数组")
    option_ids = {int(o["id"]) for o in question["options"]}
    unknown = [a for a in answer if a not in option_ids]
    if unknown:
        raise GradingError(f"选项不存在: {unknown}")
    correct_ids = sorted(int(o["id"]) for o in question["options"] if o["is_correct"])
    is_single = qtype in ("single", "true_false")
    return GradeResult(
        is_correct=grade_choice(set(correct_ids), list(answer), single=is_single),
        correct_option_ids=correct_ids,
    )
