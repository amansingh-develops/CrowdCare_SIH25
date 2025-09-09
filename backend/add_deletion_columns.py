#!/usr/bin/env python3
"""
Database migration script to add deletion tracking columns to the reports table.
Run this script to update your existing database with the new deletion tracking features.
"""

import sqlite3
import os
from datetime import datetime

def migrate_database():
    """Add deletion tracking columns to the reports table"""
    
    # Database file path
    db_path = "crowdcare.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found. Please make sure the database exists.")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Connected to database successfully.")
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(reports)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add new columns if they don't exist
        new_columns = [
            ("is_deleted", "BOOLEAN DEFAULT 0"),
            ("deletion_reason", "VARCHAR(255)"),
            ("deleted_at", "DATETIME")
        ]
        
        for column_name, column_type in new_columns:
            if column_name not in columns:
                try:
                    alter_sql = f"ALTER TABLE reports ADD COLUMN {column_name} {column_type}"
                    cursor.execute(alter_sql)
                    print(f"✓ Added column: {column_name}")
                except sqlite3.Error as e:
                    print(f"✗ Error adding column {column_name}: {e}")
            else:
                print(f"✓ Column {column_name} already exists")
        
        # Create new tables for citizen replies, ratings, and deletions
        tables_to_create = [
            """
            CREATE TABLE IF NOT EXISTS citizen_replies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_admin_reply BOOLEAN DEFAULT 0,
                admin_name VARCHAR(255)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS report_ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                feedback TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS report_deletions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_id INTEGER NOT NULL,
                reason VARCHAR(255) NOT NULL,
                deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        ]
        
        for table_sql in tables_to_create:
            try:
                cursor.execute(table_sql)
                print("✓ Created/verified table successfully")
            except sqlite3.Error as e:
                print(f"✗ Error creating table: {e}")
        
        # Commit all changes
        conn.commit()
        print("\n✓ Database migration completed successfully!")
        
        # Verify the changes
        print("\nVerifying changes...")
        cursor.execute("PRAGMA table_info(reports)")
        columns = cursor.fetchall()
        print("Reports table columns:")
        for column in columns:
            print(f"  - {column[1]} ({column[2]})")
        
        # Check if new tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [table[0] for table in cursor.fetchall()]
        print(f"\nAll tables: {', '.join(tables)}")
        
        return True
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False
    finally:
        if conn:
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    print("CrowdCare Database Migration Script")
    print("=" * 40)
    print("This script will add deletion tracking columns to your reports table")
    print("and create new tables for citizen replies, ratings, and deletions.")
    print()
    
    response = input("Do you want to proceed? (y/N): ").strip().lower()
    if response in ['y', 'yes']:
        success = migrate_database()
        if success:
            print("\n🎉 Migration completed successfully!")
            print("You can now use the new deletion tracking features.")
        else:
            print("\n❌ Migration failed. Please check the error messages above.")
    else:
        print("Migration cancelled.")
