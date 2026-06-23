#!/usr/bin/env python3
"""
Downloads question images referenced in data/questions_ab.json, converts them
to JPEG, stores them under data/images/, and rewrites each question's `image`
field to the self-hosted raw.githubusercontent.com URL.

Why: drom.ru's CDN has hotlink protection — it serves images to the website but
times out for direct requests from the mobile app. Re-hosting on GitHub (like
etspring did) makes images reliably loadable on-device and offline-cacheable.

Idempotent: skips images already downloaded. Safe to re-run after each scrape.
"""
import io
import json
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

DATA = Path(__file__).parent.parent / "data"
IMAGES_DIR = DATA / "images"
RAW_BASE = "https://raw.githubusercontent.com/lalipos/pdd-app/main/data/images"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://www.drom.ru/pdd/",
    "Accept": "image/webp,image/*",
}
REQUEST_DELAY = 0.2


def basename(url: str) -> str:
    """1542608213 from .../1542608213.jpg"""
    return url.rsplit("/", 1)[-1].rsplit(".", 1)[0]


def download_and_convert(url: str, dest: Path, retries: int = 3) -> bool:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read()
            img = Image.open(io.BytesIO(raw)).convert("RGB")
            img.save(dest, "JPEG", quality=85)
            return True
        except Exception as e:
            if attempt == retries - 1:
                print(f"  FAIL {url}: {e}", file=sys.stderr)
                return False
            time.sleep(1.0)
    return False


def main() -> None:
    IMAGES_DIR.mkdir(exist_ok=True)
    with open(DATA / "questions_ab.json", encoding="utf-8") as f:
        questions = json.load(f)

    # Map original drom URLs -> local filenames (dedup by basename)
    url_to_file = {}
    for q in questions:
        img = q.get("image", "")
        if img.startswith("http") and "drom.ru" in img:
            url_to_file[img] = basename(img) + ".jpg"

    print(f"{len(url_to_file)} unique images to ensure locally...")
    downloaded, skipped, failed = 0, 0, 0

    for url, fname in url_to_file.items():
        dest = IMAGES_DIR / fname
        if dest.exists() and dest.stat().st_size > 0:
            skipped += 1
            continue
        if download_and_convert(url, dest):
            downloaded += 1
            print(f"  OK {fname}", flush=True)
            time.sleep(REQUEST_DELAY)
        else:
            failed += 1

    # Rewrite image field to self-hosted raw URL (only for ones we have)
    rewritten = 0
    for q in questions:
        img = q.get("image", "")
        if img.startswith("http") and "drom.ru" in img:
            fname = basename(img) + ".jpg"
            if (IMAGES_DIR / fname).exists():
                q["image"] = f"{RAW_BASE}/{fname}"
                rewritten += 1

    with open(DATA / "questions_ab.json", "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    print(f"\nDownloaded: {downloaded}, skipped (cached): {skipped}, failed: {failed}")
    print(f"Rewrote {rewritten} image URLs to self-hosted GitHub raw.")
    if failed:
        print(f"WARNING: {failed} images failed — they keep their drom.ru URL.", file=sys.stderr)


if __name__ == "__main__":
    main()
