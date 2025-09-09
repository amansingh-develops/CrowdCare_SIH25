#!/usr/bin/env python3
import sqlite3

DB_PATH = "crowdcare.db"

tables = [
    "reports",
    "report_comments",
    "report_upvotes",
    "report_ratings",
    "report_deletions",
    "citizen_replies",
    "report_status_history",
]

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
for t in tables:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"{t}: {cur.fetchone()[0]}")
    except Exception:
        print(f"{t}: absent")
conn.close()


