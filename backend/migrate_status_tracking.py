#!/usr/bin/env python3
"""
Database migration script to add status tracking columns to existing reports table
"""

import sqlite3
import json
from datetime import datetime

def migrate_database():
    """Add new columns for status tracking to the reports table"""
    
    # Connect to the database
    conn = sqlite3.connect('crowdcare.db')
    cursor = conn.cursor()
    
    try:
        # Check if new columns already exist
        cursor.execute("PRAGMA table_info(reports)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add new columns if they don't exist
        new_columns = [
            ("status_history", "TEXT"),
            ("reported_at", "DATETIME"),
            ("acknowledged_at", "DATETIME"),
            ("in_progress_at", "DATETIME"),
        ]
        
        for column_name, column_type in new_columns:
            if column_name not in columns:
                print(f"Adding column: {column_name}")
                cursor.execute(f"ALTER TABLE reports ADD COLUMN {column_name} {column_type}")
        
        # Update existing records to set reported_at to created_at
        cursor.execute("""
            UPDATE reports 
            SET reported_at = created_at 
            WHERE reported_at IS NULL
        """)
        
        # Create status_history table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS report_status_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_id INTEGER NOT NULL,
                status VARCHAR(20) NOT NULL,
                changed_by VARCHAR(36),
                changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                FOREIGN KEY (report_id) REFERENCES reports (id)
            )
        """)
        
        # Create initial status history entries for existing reports
        cursor.execute("SELECT id, status, created_at, reporter_id FROM reports")
        reports = cursor.fetchall()
        
        for report_id, status, created_at, reporter_id in reports:
            # Check if status history already exists for this report
            cursor.execute("SELECT COUNT(*) FROM report_status_history WHERE report_id = ?", (report_id,))
            if cursor.fetchone()[0] == 0:
                # Create initial "reported" status entry
                cursor.execute("""
                    INSERT INTO report_status_history (report_id, status, changed_by, changed_at, notes)
                    VALUES (?, 'reported', ?, ?, 'Issue reported by citizen')
                """, (report_id, reporter_id, created_at))
                
                # Create additional status entries if status is not "reported"
                if status in ['acknowledged', 'in_progress', 'resolved']:
                    cursor.execute("""
                        INSERT INTO report_status_history (report_id, status, changed_by, changed_at, notes)
                        VALUES (?, ?, ?, ?, 'Status updated by admin')
                    """, (report_id, status, 'system', created_at))
        
        # Update status field to use new status values
        cursor.execute("""
            UPDATE reports 
            SET status = CASE 
                WHEN status = 'pending' THEN 'reported'
                WHEN status = 'new' THEN 'reported'
                ELSE status
            END
        """)
        
        # Commit all changes
        conn.commit()
        print("Database migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
