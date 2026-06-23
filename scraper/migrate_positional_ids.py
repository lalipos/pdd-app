#!/usr/bin/env python3
"""
One-off migration: switch question identity from MD5(text) to positional id
(B{ticket}Q{question}), and re-key hints accordingly.

Why: many PDD questions share identical wording but have different pictures and
answers (e.g. "Кому Вы обязаны уступить дорогу при повороте налево?" appears 12x).
MD5(text) collides, so hints got cross-wired. Position (ticket+question) is
unique (791/791) and stable across sources, so it's the correct key.

Hint re-keying path: each hint is currently keyed by the etspring question id.
We map etspring_id -> position(s) using the pre-drom snapshot (commit ae70dd1),
then assign the hint to the positional id(s) of those position(s).
"""
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).parent.parent
ASSETS = ROOT / "assets"
DATA = ROOT / "data"

ETSPRING_COMMIT = "ae70dd1"
# Orphan hint whose etspring id predates the etspring sync (found in commit d592225)
MANUAL_ORPHANS = {
    "58d1089d855a67f2148bbc6fe1a39647": ("Билет 8", "Вопрос 10"),
}


def posid(ticket_number: str, title: str) -> str:
    n = re.search(r"\d+", ticket_number).group()
    m = re.search(r"\d+", title).group()
    return f"B{n}Q{m}"


def load_git_json(commit: str, path: str):
    raw = subprocess.run(
        ["git", "show", f"{commit}:{path}"],
        capture_output=True, text=True, encoding="utf-8-sig",
    ).stdout
    return json.loads(raw)


def main():
    questions = json.load(open(DATA / "questions_ab.json", encoding="utf-8"))
    hints = json.load(open(ASSETS / "hints_ab_v2.json", encoding="utf-8"))
    etspring = load_git_json(ETSPRING_COMMIT, "assets/questions_ab.json")

    # etspring id -> list of positions (an id may map to >1 identical question)
    etspring_id_to_pos = defaultdict(list)
    for q in etspring:
        etspring_id_to_pos[q["id"]].append((q["ticket_number"], q["title"]))
    for hid, pos in MANUAL_ORPHANS.items():
        etspring_id_to_pos[hid].append(pos)

    # positions that exist in the current (drom) set
    current_positions = {(q["ticket_number"], q["title"]) for q in questions}

    # --- Re-key hints ---
    new_hints = {}
    migrated, lost = 0, []
    for hid, text in hints.items():
        positions = etspring_id_to_pos.get(hid)
        if not positions:
            lost.append((hid, "no etspring position", text[:40]))
            continue
        placed = False
        for pos in positions:
            if pos in current_positions:
                new_hints[posid(*pos)] = text
                placed = True
                migrated += 1
        if not placed:
            lost.append((hid, f"position {positions} not in drom set", text[:40]))

    # --- Re-id questions ---
    for q in questions:
        q["id"] = posid(q["ticket_number"], q["title"])

    # === VERIFICATION ===
    errors = []
    qids = [q["id"] for q in questions]
    if len(qids) != len(set(qids)):
        errors.append(f"DUPLICATE question ids: {len(qids)} ids, {len(set(qids))} unique")

    new_q_by_id = {q["id"]: q for q in questions}

    def check(pos_id, needle):
        h = new_hints.get(pos_id, "")
        if needle.lower() not in h.lower():
            errors.append(f"{pos_id}: expected '{needle}' in hint, got '{h[:60]}'")

    # Spot-check the cases we diagnosed
    check("B9Q15", "никому")          # autobus/legkovushka -> Никому
    check("B40Q15", "треугольник")    # знак уступи -> оба
    check("B8Q10", "левые полосы")    # orphan hint restored

    hints_without_question = [k for k in new_hints if k not in new_q_by_id]
    if hints_without_question:
        errors.append(f"{len(hints_without_question)} hints point to non-existent positions: {hints_without_question[:5]}")

    print(f"Questions: {len(questions)} (unique ids: {len(set(qids))})")
    print(f"Hints migrated: {migrated} -> {len(new_hints)} positional keys")
    print(f"Hints lost: {len(lost)}")
    for hid, why, txt in lost:
        print(f"  LOST {hid[:12]} [{why}]: {txt}")
    print()

    if errors:
        print("VERIFICATION FAILED:")
        for e in errors:
            print("  ✗", e)
        sys.exit(1)

    print("VERIFICATION PASSED ✓")
    print(f"  B9Q15  -> {new_hints['B9Q15'][:55]}")
    print(f"  B40Q15 -> {new_hints['B40Q15'][:55]}")
    print(f"  B8Q10  -> {new_hints['B8Q10'][:55]}")

    if "--write" in sys.argv:
        json.dump(questions, open(DATA / "questions_ab.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        json.dump(questions, open(ASSETS / "questions_ab.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        json.dump(new_hints, open(ASSETS / "hints_ab_v2.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        json.dump(new_hints, open(DATA / "hints_ab_v2.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print("\nWRITTEN to assets/ and data/.")
    else:
        print("\n(dry-run — pass --write to apply)")


if __name__ == "__main__":
    main()
