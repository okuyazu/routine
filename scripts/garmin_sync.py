#!/usr/bin/env python3
"""Pull recent running data from Garmin Connect and update data/hyrox.json.

Runs in CI (see .github/workflows/garmin-sync.yml). Authentication is via a
saved token (GARMIN_TOKEN secret) so it survives MFA and never needs your
password in CI. Generate that token once with scripts/garmin_login.py.

Garth is an unofficial, community-maintained client. Garmin has no open API
for individuals, so if Garmin changes their login this may need updating.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

HYROX = Path(__file__).resolve().parent.parent / "data" / "hyrox.json"

# Which computed values map onto which metric ids in data/hyrox.json.
# Edit this if you rename metrics or want different fields synced.
#   weeklyvol -> total training hours over the last 7 days
#   run5k     -> best recent 5K (or 5K-equivalent pace) in minutes
SYNCED_METRICS = {"weeklyvol", "run5k"}


def _parse_gmt(ts: str) -> datetime:
    """Garmin 'startTimeGMT' looks like '2026-08-01 06:30:00' (UTC)."""
    return datetime.strptime(ts, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def compute_metrics(activities: list[dict], now: datetime) -> dict[str, float]:
    """Pure function: turn a list of Garmin activities into metric updates.

    Only returns keys it can compute confidently, so unmapped or unknowable
    metrics are left untouched in the file.
    """
    updates: dict[str, float] = {}
    week_start = now - timedelta(days=7)

    # Weekly training volume: sum of every activity's duration in the last 7 days.
    week_seconds = 0.0
    for a in activities:
        ts = a.get("startTimeGMT")
        dur = a.get("duration")
        if not ts or not dur:
            continue
        if _parse_gmt(ts) >= week_start:
            week_seconds += float(dur)
    if week_seconds > 0:
        updates["weeklyvol"] = round(week_seconds / 3600.0, 1)

    # Best recent 5K: among runs of at least ~4.7 km, take the fastest average
    # pace and express it as a 5K time. Longer runs are extrapolated to 5K, so
    # this is a proxy for current 5K fitness, not a laboratory time.
    best_5k_sec = None
    for a in activities:
        type_key = (a.get("activityType") or {}).get("typeKey", "")
        if "run" not in type_key:
            continue
        dist = a.get("distance") or 0.0      # meters
        dur = a.get("duration") or 0.0       # seconds
        if dist < 4700 or dur <= 0:
            continue
        equiv = dur * 5000.0 / dist
        if best_5k_sec is None or equiv < best_5k_sec:
            best_5k_sec = equiv
    if best_5k_sec is not None:
        updates["run5k"] = round(best_5k_sec / 60.0, 1)

    return updates


def apply_updates(path: Path, updates: dict[str, float]) -> list[str]:
    """Write computed values onto the matching metric.current fields.

    Returns a list of human-readable change descriptions (empty if nothing
    changed). Preserves key order; leaves every other field alone.
    """
    data = json.loads(path.read_text(encoding="utf-8"))
    changes: list[str] = []
    for metric in data.get("metrics", []):
        mid = metric.get("id")
        if mid in SYNCED_METRICS and mid in updates:
            new = updates[mid]
            old = metric.get("current")
            if old != new:
                changes.append(f"{metric.get('label', mid)}: {old} -> {new} {metric.get('unit','')}".strip())
                metric["current"] = new
    if changes:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return changes


def fetch_activities(limit: int = 40) -> list[dict]:
    """Authenticate to Garmin and return the most recent activities."""
    import garth

    token = os.environ.get("GARMIN_TOKEN")
    email = os.environ.get("GARMIN_EMAIL")
    password = os.environ.get("GARMIN_PASSWORD")

    if token:
        garth.client.loads(token)          # resume saved session (MFA-safe)
    elif email and password:
        garth.login(email, password)       # only works on accounts without MFA
    else:
        sys.exit("No Garmin credentials: set GARMIN_TOKEN (preferred) or "
                 "GARMIN_EMAIL + GARMIN_PASSWORD.")

    result = garth.connectapi(
        "/activitylist-service/activities/search/activities",
        params={"limit": limit, "start": 0},
    )
    return result or []


def main() -> None:
    activities = fetch_activities()
    updates = compute_metrics(activities, datetime.now(timezone.utc))
    if not updates:
        print("Nothing to sync (no usable activities found).")
        return
    changes = apply_updates(HYROX, updates)
    if changes:
        print("Updated Hyrox metrics from Garmin:")
        for c in changes:
            print(f"  - {c}")
    else:
        print("Garmin data already matches; no change.")


if __name__ == "__main__":
    main()
