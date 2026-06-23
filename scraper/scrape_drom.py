#!/usr/bin/env python3
"""
Scrapes PDD questions from drom.ru (mirrors official ГИБДД question bank).
Outputs data/questions_ab.json and updates data/meta.json.

ID = MD5(question_text) — stable across re-scrapes if text unchanged,
so existing hints remain valid.

Exit 0 = changes found (GitHub Action commits), 1 = no changes.
"""
import hashlib
import json
import sys
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

from bs4 import BeautifulSoup

BASE_URL = "https://www.drom.ru/pdd/bilet_{n}/vopros_{q}/"
NUM_TICKETS = 40
QUESTIONS_PER_TICKET = 20
DATA = Path(__file__).parent.parent / "data"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Encoding": "identity",
    "Accept": "text/html",
    "Accept-Language": "ru-RU,ru;q=0.9",
}
REQUEST_DELAY = 0.5  # seconds between requests


def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        charset = r.headers.get_content_charset() or "windows-1251"
        return r.read().decode(charset, errors="replace")


def make_id(question_text: str) -> str:
    return hashlib.md5(question_text.strip().encode("utf-8")).hexdigest()


def parse_question(html: str, ticket: int, question: int) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    block = soup.find("div", class_="pdd-ticket")
    if not block:
        raise ValueError(f"No pdd-ticket block found for Б{ticket}В{question}")

    # Question text
    q_div = block.find("div", class_="b-title_type_h4")
    question_text = q_div.get_text(strip=True) if q_div else ""

    # Image
    img = block.find("img", class_="b-image__image")
    image_url = img["src"] if img else ""

    # Answers — each is a b-flex div containing [number_div, text_div]
    answer_divs = block.find_all("div", class_="b-flex")
    answers = []
    correct_id = f"a{question}"

    for a_div in answer_divs:
        children = [c for c in a_div.children if getattr(c, "name", None) == "div"]
        if len(children) < 2:
            continue
        text_div = children[1]
        text = text_div.get_text(strip=True)
        if not text:
            continue
        is_correct = text_div.get("id") == correct_id
        answers.append({"answer_text": text, "is_correct": is_correct})

    # Explanation block
    comment_div = block.find("div", id=f"c{question}")
    answer_tip = ""
    correct_answer = ""
    if comment_div:
        raw = comment_div.get_text(separator="\n", strip=True)
        lines = [l.strip() for l in raw.splitlines() if l.strip()]
        if lines:
            correct_answer = lines[0]  # e.g. "Правильный ответ: 2"
            answer_tip = "\n".join(lines[1:])

    qid = make_id(question_text)

    return {
        "id": qid,
        "title": f"Вопрос {question}",
        "ticket_number": f"Билет {ticket}",
        "ticket_category": "A,B",
        "image": image_url,
        "question": question_text,
        "answers": answers,
        "correct_answer": correct_answer,
        "answer_tip": answer_tip,
        "topic": [],
    }


def question_fingerprint(q: dict) -> tuple:
    """Fields that invalidate a hint: question wording, image, and answer options."""
    answers = tuple((a["answer_text"], a["is_correct"]) for a in q["answers"])
    return (q["question"], q.get("image", ""), answers)


def main() -> bool:
    print("Loading current data...")
    with open(DATA / "questions_ab.json", encoding="utf-8") as f:
        current_questions: list = json.load(f)
    with open(DATA / "meta.json", encoding="utf-8") as f:
        meta: dict = json.load(f)

    current_by_id = {q["id"]: q for q in current_questions}
    current_fp = {q["id"]: question_fingerprint(q) for q in current_questions}

    print(f"Scraping {NUM_TICKETS} tickets x {QUESTIONS_PER_TICKET} questions from drom.ru...")
    new_questions: list = []
    errors = 0

    for n in range(1, NUM_TICKETS + 1):
        ticket_qs = []
        for q in range(1, QUESTIONS_PER_TICKET + 1):
            url = BASE_URL.format(n=n, q=q)
            try:
                html = fetch_html(url)
                parsed = parse_question(html, n, q)
                ticket_qs.append(parsed)
                time.sleep(REQUEST_DELAY)
            except Exception as e:
                print(f"  ERROR Б{n}В{q}: {e}", file=sys.stderr)
                errors += 1
        new_questions.extend(ticket_qs)
        print(f"  Билет {n:02d}: {len(ticket_qs)} вопросов", flush=True)

    if errors > 10:
        print(f"Too many errors ({errors}), aborting.", file=sys.stderr)
        sys.exit(2)

    # Build text-based lookup for existing questions to survive ID changes
    # (etspring and drom.ru may compute different IDs for same question text)
    current_by_text = {
        q["question"].strip(): q["id"]
        for q in current_questions
    }

    # Re-assign IDs: if question text matches existing → keep old ID (hints survive)
    for q in new_questions:
        old_id = current_by_text.get(q["question"].strip())
        if old_id:
            q["id"] = old_id

    new_by_id = {q["id"]: q for q in new_questions}

    needs_review: set = set(meta.get("needs_review", []))
    changed, added = [], []

    for qid, q in new_by_id.items():
        if qid not in current_by_id:
            added.append(qid)
            needs_review.add(qid)
        elif question_fingerprint(q) != current_fp.get(qid):
            changed.append(qid)
            needs_review.add(qid)

    # Drop needs_review IDs that no longer exist
    needs_review = {i for i in needs_review if i in new_by_id}

    has_changes = bool(changed or added)

    with open(DATA / "questions_ab.json", "w", encoding="utf-8") as f:
        json.dump(new_questions, f, ensure_ascii=False, indent=2)

    meta["version"] = meta.get("version", 0) + (1 if has_changes else 0)
    meta["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    meta["source"] = "drom.ru"
    meta["needs_review"] = sorted(needs_review)
    meta["stats"] = {
        "total": len(new_questions),
        "changed": len(changed),
        "added": len(added),
        "errors": errors,
    }

    with open(DATA / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"\nScrape complete — {'CHANGES FOUND' if has_changes else 'no changes'}:")
    print(f"  Total:   {len(new_questions)}")
    print(f"  Changed: {len(changed)}")
    print(f"  Added:   {len(added)}")
    print(f"  Errors:  {errors}")
    print(f"  Needs review: {len(needs_review)}")

    return has_changes


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
