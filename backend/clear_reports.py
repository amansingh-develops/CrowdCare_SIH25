#!/usr/bin/env python3
"""
Utility to purge all report data and related records from the local SQLite DB,
and optionally remove uploaded images from the local uploads directory.

Usage:
  python clear_reports.py            # purge DB only
  python clear_reports.py --files    # purge DB and delete uploaded images
"""

import argparse
import os
import sqlite3
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent

# Candidate DBs: backend-local and project root
DB_PATHS = [
    SCRIPT_DIR / "crowdcare.db",
    ROOT_DIR / "crowdcare.db",
]
UPLOADS_DIR = ROOT_DIR / "uploads"


def purge_database(db_path: Path) -> None:
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute("PRAGMA foreign_keys = OFF;")
        cursor = conn.cursor()

        tables_in_order = [
            # Child tables first
            "report_comments",
            "report_upvotes",
            "report_ratings",
            "report_deletions",
            "citizen_replies",
            "report_status_history",
            # Parent table last
            "reports",
        ]

        for table in tables_in_order:
            try:
                cursor.execute(f"DELETE FROM {table};")
            except sqlite3.OperationalError:
                # Table may not exist; ignore
                pass

        conn.commit()
    finally:
        conn.close()


def purge_uploads(uploads_dir: Path) -> None:
    if not uploads_dir.exists():
        return
    # Remove dated subdirectories/files under uploads, keep root dir
    for root, dirs, files in os.walk(uploads_dir, topdown=False):
        for name in files:
            try:
                Path(root, name).unlink()
            except OSError:
                pass
        for name in dirs:
            try:
                Path(root, name).rmdir()
            except OSError:
                pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Purge all report data")
    parser.add_argument(
        "--files",
        action="store_true",
        help="Also delete uploaded image files under uploads/",
    )
    args = parser.parse_args()

    for db_path in DB_PATHS:
        if db_path.exists():
            purge_database(db_path)
        else:
            # Skip silently if DB does not exist
            pass
    if args.files:
        purge_uploads(UPLOADS_DIR)


if __name__ == "__main__":
    main()


