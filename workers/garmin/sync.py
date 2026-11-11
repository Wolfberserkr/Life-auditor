"""Garmin → Supabase daily health sync for the Chief of Staff.

Runs hourly from GitHub Actions (.github/workflows/garmin-sync.yml). Pulls the
last few days of sleep, HRV, body battery, training readiness, resting HR,
steps and stress, and upserts one row per day into public.cos_health_daily.

Auth: Garmin session tokens (JSON) live in public.cos_secrets under the key
'garmin_tokens'. They are refreshed by the library and written back after each
run, so the login survives without your password. Bootstrap once with login.py.

The repository is public, so this script never prints health values or
tokens, only counts and error types.
"""

from __future__ import annotations

import datetime as dt
import os
import sys
from typing import Any

import requests
from garminconnect import Garmin

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DAYS = int(os.environ.get("GARMIN_SYNC_DAYS", "3"))
TZ_OFFSET_HOURS = float(os.environ.get("COS_UTC_OFFSET_HOURS", "-4"))  # local "today"

REST = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}


def get_tokens() -> str | None:
    r = requests.get(f"{REST}/cos_secrets", headers=HEADERS,
                     params={"key": "eq.garmin_tokens", "select": "value"}, timeout=30)
    r.raise_for_status()
    rows = r.json()
    return rows[0]["value"] if rows else os.environ.get("GARMINTOKENS")


def save_tokens(value: str) -> None:
    r = requests.post(
        f"{REST}/cos_secrets",
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
        json={"key": "garmin_tokens", "value": value,
              "updated_at": dt.datetime.now(dt.timezone.utc).isoformat()},
        timeout=30,
    )
    r.raise_for_status()


def dig(obj: Any, *path: Any) -> Any:
    for key in path:
        if obj is None:
            return None
        if isinstance(key, int):
            obj = obj[key] if isinstance(obj, list) and len(obj) > key else None
        else:
            obj = obj.get(key) if isinstance(obj, dict) else None
    return obj


def as_int(v: Any) -> int | None:
    try:
        return None if v is None else int(round(float(v)))
    except (TypeError, ValueError):
        return None


def safe(fn, *args):
    try:
        return fn(*args)
    except Exception as e:  # one missing metric must not sink the whole day
        print(f"  {fn.__name__}: {type(e).__name__}", file=sys.stderr)
        return None


def day_row(g: Garmin, date: str) -> dict[str, Any]:
    stats = safe(g.get_stats, date) or {}
    sleep = safe(g.get_sleep_data, date) or {}
    hrv = safe(g.get_hrv_data, date) or {}
    readiness = safe(g.get_training_readiness, date) or []
    if isinstance(readiness, dict):
        readiness = [readiness]

    daily_sleep = sleep.get("dailySleepDTO") or {}
    tr = readiness[0] if readiness else {}
    return {
        "date": date,
        "sleep_seconds": as_int(daily_sleep.get("sleepTimeSeconds")),
        "sleep_score": as_int(dig(daily_sleep, "sleepScores", "overall", "value")),
        "hrv_last_night": as_int(dig(hrv, "hrvSummary", "lastNightAvg")),
        "hrv_status": dig(hrv, "hrvSummary", "status"),
        "body_battery_high": as_int(stats.get("bodyBatteryHighestValue")),
        "body_battery_low": as_int(stats.get("bodyBatteryLowestValue")),
        "body_battery_now": as_int(stats.get("bodyBatteryMostRecentValue")),
        "training_readiness": as_int(tr.get("score")),
        "readiness_level": tr.get("level"),
        "resting_hr": as_int(stats.get("restingHeartRate")),
        "steps": as_int(stats.get("totalSteps")),
        "stress_avg": as_int(stats.get("averageStressLevel")),
        "raw": {
            "sleep": {k: daily_sleep.get(k) for k in (
                "sleepStartTimestampLocal", "sleepEndTimestampLocal", "deepSleepSeconds",
                "lightSleepSeconds", "remSleepSeconds", "awakeSleepSeconds")},
            "readiness_feedback": tr.get("feedbackShort"),
            "recovery_time_h": as_int((tr.get("recoveryTime") or 0) / 60) if tr.get("recoveryTime") else None,
            "intensity_minutes": {
                "moderate": stats.get("moderateIntensityMinutes"),
                "vigorous": stats.get("vigorousIntensityMinutes"),
            },
        },
        "updated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def main() -> int:
    tokens = get_tokens()
    if not tokens:
        print("No Garmin tokens. Run workers/garmin/login.py once.", file=sys.stderr)
        return 1
    g = Garmin()
    g.login(tokens)

    today = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=TZ_OFFSET_HOURS)).date()
    rows = [day_row(g, (today - dt.timedelta(days=i)).isoformat()) for i in range(DAYS)]
    r = requests.post(
        f"{REST}/cos_health_daily",
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
        json=rows, timeout=30,
    )
    r.raise_for_status()

    # Persist refreshed tokens so the session keeps rolling.
    save_tokens(g.client.dumps())
    print(f"Synced {len(rows)} day(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
