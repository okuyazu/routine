#!/usr/bin/env python3
"""Pull recent running data from Garmin Connect and write data/garmin.json.

Runs in CI (see .github/workflows/garmin-sync.yml). Authentication is via a
saved token (GARMIN_TOKEN secret) so it survives MFA and never needs your
password in CI. Generate that token once with scripts/garmin_login.py.

The app reads data/garmin.json and auto-fills any weekly/monthly "running
distance" quota (a sum quota in km whose title mentions "run") with the total
for the current ISO week / month.

Garth is an unofficial, community-maintained client. Garmin has no open API
for individuals, so if Garmin changes their login this may need updating.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "garmin.json"


def _parse_gmt(ts: str) -> datetime:
    """Garmin 'startTimeGMT' looks like '2026-08-01 06:30:00' (UTC)."""
    return datetime.strptime(ts, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def _iso_week(d: datetime) -> str:
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


def summarize(activities: list[dict], now: datetime) -> dict:
    """Turn Garmin activities into weekly/monthly running totals (km) + recent runs."""
    cur_week = _iso_week(now)
    cur_month = now.strftime("%Y-%m")
    week_m = 0.0
    month_m = 0.0
    recent: list[dict] = []
    for a in activities:
        type_key = (a.get("activityType") or {}).get("typeKey", "") or ""
        if "run" not in type_key.lower():
            continue
        ts = a.get("startTimeGMT")
        dist = a.get("distance") or 0.0  # meters
        if not ts or dist <= 0:
            continue
        when = _parse_gmt(ts)
        if _iso_week(when) == cur_week:
            week_m += float(dist)
        if when.strftime("%Y-%m") == cur_month:
            month_m += float(dist)
        if len(recent) < 8:
            recent.append({
                "date": when.date().isoformat(),
                "km": round(float(dist) / 1000.0, 2),
                "name": a.get("activityName") or "Run",
            })
    return {
        "week": cur_week,
        "weekKm": round(week_m / 1000.0, 2),
        "month": cur_month,
        "monthKm": round(month_m / 1000.0, 2),
        "recent": recent,
        "updatedAt": now.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    }


def fetch_activities(limit: int = 50) -> list[dict]:
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
    data = summarize(activities, datetime.now(timezone.utc))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT.name}: {data['weekKm']} km this week ({data['week']}), "
          f"{data['monthKm']} km this month.")


if __name__ == "__main__":
    main()
