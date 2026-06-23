#!/usr/bin/env python3
"""
Scrapes PDD questions from drom.ru (mirrors official ГИБДД question bank).
Outputs data/questions_ab.json and updates data/meta.json.

Question id is positional: B{ticket}Q{question} — unique and stable across
sources, so hints (keyed by the same id) stay attached to the right question.

Resilience:
- If a question fails to scrape (timeout) or comes back malformed, the
  PREVIOUS good version is kept instead of dropping it — no data loss.
- Before writing, the whole set is validated; if it looks broken (too few
  questions, too many malformed), the script aborts WITHOUT writing so the
  daily workflow never commits garbage.

Exit codes: 0 = changes found (workflow commits), 1 = no changes, 2 = aborted.
"""
import json
import sys
import time
import urllib.request
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

# Validation guards — protect against drom.ru layout changes / mass failures
EXPECTED_TOTAL = NUM_TICKETS * QUESTIONS_PER_TICKET  # 800
MIN_QUESTIONS = 790            # abort if fewer survive
MAX_MALFORMED = 5              # abort if more than this look broken


def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        charset = r.headers.get_content_charset() or "windows-1251"
        return r.read().decode(charset, errors="replace")


def make_id(ticket: int, question: int) -> str:
    """Positional id: B{ticket}Q{question}. Unique and stable across sources.
    NOT based on text — many questions share identical wording (different
    picture/answers), which would collide and cross-wire hints."""
    return f"B{ticket}Q{question}"


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

    qid = make_id(ticket, question)

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


def image_id(url: str) -> str:
    """Filename without extension: '1542608213' from both the drom.ru URL and the
    re-hosted GitHub raw URL. Lets fingerprints survive re-hosting while still
    detecting a genuinely new picture (drom assigns a new file id)."""
    if not url:
        return ""
    return url.rsplit("/", 1)[-1].rsplit(".", 1)[0]


def question_fingerprint(q: dict) -> tuple:
    """Fields that invalidate a hint: question wording, image, and answer options."""
    answers = tuple((a["answer_text"], a["is_correct"]) for a in q["answers"])
    return (q["question"], image_id(q.get("image", "")), answers)


def is_valid_question(q: dict) -> bool:
    """A question is usable only if it has text, ≥2 answers, and a correct one.
    Catches drom.ru returning a page that loads but parses to empty fields."""
    return bool(
        q.get("question", "").strip()
        and len(q.get("answers", [])) >= 2
        and any(a.get("is_correct") for a in q["answers"])
    )


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
    kept_previous = 0

    for n in range(1, NUM_TICKETS + 1):
        ticket_qs = []
        for q in range(1, QUESTIONS_PER_TICKET + 1):
            url = BASE_URL.format(n=n, q=q)
            qid = make_id(n, q)
            try:
                html = fetch_html(url)
                parsed = parse_question(html, n, q)
                if not is_valid_question(parsed):
                    raise ValueError("parsed question is malformed (empty/no answers/no correct)")
                ticket_qs.append(parsed)
                time.sleep(REQUEST_DELAY)
            except Exception as e:
                errors += 1
                # Don't drop the question — keep its previous good version if we have one
                previous = current_by_id.get(qid)
                if previous and is_valid_question(previous):
                    ticket_qs.append(previous)
                    kept_previous += 1
                    print(f"  WARN Б{n}В{q}: {e} — kept previous version", file=sys.stderr)
                else:
                    print(f"  ERROR Б{n}В{q}: {e} — NO previous version to fall back on", file=sys.stderr)
        new_questions.extend(ticket_qs)
        print(f"  Билет {n:02d}: {len(ticket_qs)} вопросов", flush=True)

    # --- Validation guard: never write/commit a broken dataset ---
    malformed = [q["id"] for q in new_questions if not is_valid_question(q)]
    abort_reasons = []
    if len(new_questions) < MIN_QUESTIONS:
        abort_reasons.append(f"only {len(new_questions)} questions (< {MIN_QUESTIONS})")
    if len(malformed) > MAX_MALFORMED:
        abort_reasons.append(f"{len(malformed)} malformed questions (> {MAX_MALFORMED})")
    if abort_reasons:
        print("ABORT — dataset failed validation, not writing:", file=sys.stderr)
        for r in abort_reasons:
            print(f"  - {r}", file=sys.stderr)
        print(f"  (scrape errors: {errors}, kept previous: {kept_previous})", file=sys.stderr)
        sys.exit(2)

    # IDs are positional (B{ticket}Q{question}) — stable across sources, no
    # text-matching needed. The fingerprint below detects content changes.
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
        "kept_previous": kept_previous,
    }

    with open(DATA / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"\nScrape complete — {'CHANGES FOUND' if has_changes else 'no changes'}:")
    print(f"  Total:   {len(new_questions)}")
    print(f"  Changed: {len(changed)}")
    print(f"  Added:   {len(added)}")
    print(f"  Errors:  {errors} (kept previous version: {kept_previous})")
    print(f"  Needs review: {len(needs_review)}")

    return has_changes


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
