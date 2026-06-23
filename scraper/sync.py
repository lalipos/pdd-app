#!/usr/bin/env python3
"""
Syncs PDD questions from etspring/pdd_russia to data/.
Detects changed questions and marks their hints as needs_review.
Exit code 0 = changes found, 1 = no changes (GitHub Action uses this to skip commit).
"""
import json
import sys
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

ETSPRING = "https://raw.githubusercontent.com/etspring/pdd_russia/master"
DATA = Path(__file__).parent.parent / "data"
NUM_TICKETS = 40


def fetch_json(url: str) -> object:
    req = urllib.request.Request(url, headers={"User-Agent": "pdd-sync/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def question_fingerprint(q: dict) -> tuple:
    """Tuple of fields that matter for hint validity."""
    answers = tuple((a["answer_text"], a["is_correct"]) for a in q["answers"])
    return (q["question"], answers, q.get("answer_tip", ""), q.get("image", ""))


def main() -> bool:
    print("Loading current data...")
    with open(DATA / "questions_ab.json", encoding="utf-8") as f:
        current_questions: list = json.load(f)
    with open(DATA / "meta.json", encoding="utf-8") as f:
        meta: dict = json.load(f)

    current_by_id = {q["id"]: q for q in current_questions}
    current_fp = {q["id"]: question_fingerprint(q) for q in current_questions}

    print(f"Fetching {NUM_TICKETS} tickets from etspring/pdd_russia...")
    new_questions: list = []
    for n in range(1, NUM_TICKETS + 1):
        url = f"{ETSPRING}/questions/A_B/tickets/{urllib.parse.quote(f'Билет {n}')}.json"
        try:
            ticket = fetch_json(url)
            new_questions.extend(ticket)
            print(f"  Билет {n:02d}: {len(ticket)} вопросов", flush=True)
        except Exception as e:
            print(f"  ERROR Билет {n}: {e}", file=sys.stderr)
            sys.exit(2)

    new_by_id = {q["id"]: q for q in new_questions}

    # Detect changes
    needs_review: set = set(meta.get("needs_review", []))
    changed: list = []
    added: list = []

    for qid, q in new_by_id.items():
        if qid not in current_by_id:
            added.append(qid)
            needs_review.add(qid)
        elif question_fingerprint(q) != current_fp.get(qid):
            changed.append(qid)
            needs_review.add(qid)

    # Remove needs_review for questions that no longer exist
    needs_review = {qid for qid in needs_review if qid in new_by_id}

    has_changes = bool(changed or added)

    # Always save updated questions (order may change, new content from etspring)
    with open(DATA / "questions_ab.json", "w", encoding="utf-8") as f:
        json.dump(new_questions, f, ensure_ascii=False, indent=2)

    meta["version"] = meta.get("version", 0) + (1 if has_changes else 0)
    meta["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    meta["needs_review"] = sorted(needs_review)
    meta["stats"] = {
        "total": len(new_questions),
        "changed": len(changed),
        "added": len(added),
    }

    with open(DATA / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"\nSync complete — {'CHANGES FOUND' if has_changes else 'no changes'}:")
    print(f"  Total:   {len(new_questions)}")
    print(f"  Changed: {len(changed)}")
    print(f"  Added:   {len(added)}")
    print(f"  Needs review: {len(needs_review)}")

    return has_changes


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
