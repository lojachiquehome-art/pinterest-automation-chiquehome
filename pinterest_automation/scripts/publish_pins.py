import argparse
import csv
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "output" / "pins_batch.csv"
BOARD_MAP = ROOT / "data" / "board_ids.json"
API_BASE = "https://api.pinterest.com/v5"


def api_request(method, path, token, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Pinterest API error {exc.code}: {body}") from exc


def read_rows(limit=None):
    with INPUT.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    rows = [r for r in rows if r.get("status") == "ready"]
    return rows[:limit] if limit else rows


def load_board_map():
    if not BOARD_MAP.exists():
        raise FileNotFoundError(
            f"Missing {BOARD_MAP}. Create it with board names and IDs before publishing."
        )
    with BOARD_MAP.open("r", encoding="utf-8") as f:
        return json.load(f)


def create_pin_payload(row, board_id):
    return {
        "board_id": board_id,
        "title": row["title"],
        "description": row["description"],
        "link": row["link"],
        "alt_text": row["alt_text"],
        "media_source": {
            "source_type": "image_url",
            "url": row["image_url"],
        },
    }


def publish(limit=None, dry_run=False, sleep_seconds=10):
    token = os.environ.get("PINTEREST_ACCESS_TOKEN")
    if not dry_run and not token:
        raise RuntimeError("Set PINTEREST_ACCESS_TOKEN before publishing.")

    rows = read_rows(limit)
    board_map = load_board_map()
    published = []

    for row in rows:
        board_id = board_map.get(row["board_name"])
        if not board_id:
            print(f"SKIP missing board id: {row['board_name']} | {row['title']}")
            continue
        payload = create_pin_payload(row, board_id)
        if dry_run:
            print(json.dumps(payload, ensure_ascii=False, indent=2))
        else:
            result = api_request("POST", "/pins", token, payload)
            published.append({"row_id": row["id"], "pin": result})
            print(f"Published pin for row {row['id']}: {result.get('id')}")
            time.sleep(sleep_seconds)

    if published:
        out = ROOT / "output" / "published_pins.json"
        with out.open("w", encoding="utf-8") as f:
            json.dump(published, f, ensure_ascii=False, indent=2)
        print(out)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--sleep", type=int, default=10)
    args = parser.parse_args()
    publish(limit=args.limit, dry_run=args.dry_run, sleep_seconds=args.sleep)

