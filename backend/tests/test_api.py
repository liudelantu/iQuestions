SINGLE = {
    "type": "single",
    "title": "1 + 1 = ?",
    "options": [{"content": "1"}, {"content": "2", "is_correct": True}, {"content": "3"}],
    "explanation": "基础算术",
    "difficulty": "easy",
    "category": "数学",
    "tags": ["加法", "基础", "加法"],
}


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_question_crud_flow(client):
    r = client.post("/api/questions", json=SINGLE)
    assert r.status_code == 201, r.text
    q = r.json()
    assert q["type_label"] == "单选题"
    assert q["tags"] == ["加法", "基础"], "标签去重"
    assert [o["label"] for o in q["options"]] == ["A", "B", "C"]
    qid = q["id"]

    r = client.get(f"/api/questions/{qid}")
    assert r.status_code == 200 and r.json()["title"] == "1 + 1 = ?"

    updated = {**SINGLE, "title": "2 + 2 = ?", "options": [{"content": "3"}, {"content": "4", "is_correct": True}]}
    r = client.put(f"/api/questions/{qid}", json=updated)
    assert r.status_code == 200
    assert r.json()["title"] == "2 + 2 = ?" and len(r.json()["options"]) == 2

    r = client.get("/api/questions", params={"category": "数学", "tag": "加法", "keyword": "2 + 2"})
    assert r.json()["total"] == 1
    r = client.get("/api/questions", params={"tag": "不存在"})
    assert r.json()["total"] == 0

    r = client.get("/api/meta")
    assert r.json()["total_questions"] == 1
    assert r.json()["categories"] == [{"name": "数学", "count": 1}]

    r = client.delete(f"/api/questions/{qid}")
    assert r.status_code == 204
    assert client.get(f"/api/questions/{qid}").status_code == 404
    assert client.delete(f"/api/questions/{qid}").status_code == 404


def test_validation_errors(client):
    bad_cases = [
        {**SINGLE, "options": [{"content": "1"}, {"content": "2"}]},  # 无正确答案
        {**SINGLE, "options": [{"content": "1", "is_correct": True}]},  # 选项过少
        {**SINGLE, "type": "true_false"},  # 判断题需要恰好 2 个选项
        {**SINGLE, "title": ""},
        {**SINGLE, "difficulty": "impossible"},
        {**SINGLE, "type": "essay"},
        {"type": "fill_blank", "title": "x ____"},  # 缺答案
        {"type": "fill_blank", "title": "x ____", "fill_answers": [[""]]},
        {"type": "fill_blank", "title": "x", "fill_answers": [["a"]], "options": [{"content": "a"}]},
    ]
    for body in bad_cases:
        r = client.post("/api/questions", json=body)
        assert r.status_code == 422, body
        assert isinstance(r.json()["detail"], str) and r.json()["detail"]


def test_source_id_conflict(client):
    body = {**SINGLE, "source_id": "s-1"}
    assert client.post("/api/questions", json=body).status_code == 201
    assert client.post("/api/questions", json=body).status_code == 409


def test_import_partial_failure(client):
    items = [
        SINGLE,
        {"type": "fill_blank", "title": "缺答案"},
        {
            "type": "true_false",
            "title": "判断",
            "options": [{"content": "正确", "is_correct": True}, {"content": "错误"}],
        },
    ]
    r = client.post("/api/questions/import", json=items)
    assert r.status_code == 200
    data = r.json()
    assert data["imported"] == 2 and len(data["ids"]) == 2
    assert data["failed"][0]["index"] == 1 and "填空题" in data["failed"][0]["error"]

    r = client.post("/api/questions/import", json={"questions": [SINGLE]})
    assert r.json()["imported"] == 1
    assert client.post("/api/questions/import", json={"foo": 1}).status_code == 422
    assert client.post("/api/questions/import", json=[]).status_code == 422


def test_practice_and_answer_flow(client):
    qid = client.post("/api/questions", json=SINGLE).json()["id"]
    r = client.get("/api/practice/questions", params={"mode": "sequential", "category": "数学"})
    assert r.status_code == 200
    pq = r.json()[0]
    assert pq["id"] == qid and "explanation" not in pq
    assert all("is_correct" not in o for o in pq["options"])

    wrong = pq["options"][0]["id"]
    r = client.post("/api/practice/answer", json={"question_id": qid, "answer": [wrong]})
    assert r.status_code == 200
    body = r.json()
    assert body["is_correct"] is False and body["in_wrong_book"] is True
    assert body["explanation"] == "基础算术" and len(body["correct_option_ids"]) == 1

    r = client.get("/api/wrong-book")
    assert [i["question"]["id"] for i in r.json()] == [qid]

    r = client.post("/api/practice/answer", json={"question_id": qid, "answer": body["correct_option_ids"], "mode": "wrong_book"})
    assert r.json()["is_correct"] and r.json()["in_wrong_book"] is False
    assert client.get("/api/wrong-book").json() == []

    assert client.post("/api/practice/answer", json={"question_id": 9999, "answer": [1]}).status_code == 404
    assert client.post("/api/practice/answer", json={"question_id": qid, "answer": ["A"]}).status_code == 422
    assert client.post("/api/practice/answer", json={"question_id": qid, "answer": [1, "A"]}).status_code == 422
    assert client.delete(f"/api/wrong-book/{qid}").status_code == 404

    s = client.get("/api/stats/overview").json()
    assert s["total_attempts"] == 2 and s["correct_attempts"] == 1


def test_favorites(client):
    qid = client.post("/api/questions", json=SINGLE).json()["id"]
    assert client.put(f"/api/questions/{qid}/favorite").json()["is_favorite"] is True
    assert client.get("/api/questions", params={"favorite": "true"}).json()["total"] == 1
    fav = client.get("/api/practice/questions", params={"mode": "favorites"}).json()
    assert [q["id"] for q in fav] == [qid]
    assert client.delete(f"/api/questions/{qid}/favorite").json()["is_favorite"] is False
    assert client.get("/api/questions", params={"favorite": "true"}).json()["total"] == 0
    assert client.put("/api/questions/9999/favorite").status_code == 404
