import pytest

from app.services.grading import GradingError, grade, grade_choice, grade_fill, normalize_text


def test_single_choice_exact_match():
    assert grade_choice({2}, [2], single=True)
    assert not grade_choice({2}, [1], single=True)
    assert not grade_choice({2}, [], single=True)
    # 单选多选了也算错
    assert not grade_choice({2}, [1, 2], single=True)


def test_multiple_choice_requires_full_match():
    assert grade_choice({1, 2}, [2, 1], single=False)
    assert not grade_choice({1, 2}, [1], single=False), "少选算错"
    assert not grade_choice({1, 2}, [1, 2, 3], single=False), "多选算错"
    assert not grade_choice({1, 2}, [3], single=False)
    assert grade_choice({1, 2}, [1, 1, 2], single=False), "重复选择去重后应视为正确"


def test_normalize_text_is_lenient():
    assert normalize_text("  Lambda ") == "lambda"
    assert normalize_text("ＧＲＯＵＰ　ＢＹ") == "group by"
    assert normalize_text("group   by") == "group by"


def test_fill_blank_multiple_blanks_and_aliases():
    answers = [["lambda"], ["4", "四"]]
    assert grade_fill(answers, ["lambda", "4"])
    assert grade_fill(answers, ["LAMBDA", " 四 "])
    assert not grade_fill(answers, ["lambda", "5"])
    assert not grade_fill(answers, ["lambda"]), "空数量不一致"
    assert not grade_fill(answers, ["lambda", "4", "extra"])
    assert not grade_fill(answers, ["", "4"])


def _choice_question(qtype):
    return {
        "type": qtype,
        "options": [
            {"id": 11, "is_correct": True},
            {"id": 12, "is_correct": qtype == "multiple"},
            {"id": 13, "is_correct": False},
        ],
        "fill_answers": None,
    }


def test_grade_dispatch_single_and_true_false():
    for qtype in ("single", "true_false"):
        r = grade(_choice_question(qtype), [11])
        assert r.is_correct and r.correct_option_ids == [11] and r.correct_answers is None
        assert not grade(_choice_question(qtype), [13]).is_correct


def test_grade_dispatch_multiple():
    q = _choice_question("multiple")
    assert grade(q, [12, 11]).is_correct
    r = grade(q, [11])
    assert not r.is_correct and r.correct_option_ids == [11, 12]


def test_grade_dispatch_fill_blank():
    q = {"type": "fill_blank", "options": [], "fill_answers": [["443"], ["80"]]}
    r = grade(q, ["443", "80"])
    assert r.is_correct and r.correct_answers == [["443"], ["80"]] and r.correct_option_ids == []


def test_grade_rejects_mismatched_answer_shape():
    with pytest.raises(GradingError):
        grade(_choice_question("single"), ["A"])
    with pytest.raises(GradingError):
        grade(_choice_question("single"), [999])
    with pytest.raises(GradingError):
        grade({"type": "fill_blank", "options": [], "fill_answers": [["x"]]}, [1])
    with pytest.raises(GradingError):
        grade(_choice_question("single"), [True])
