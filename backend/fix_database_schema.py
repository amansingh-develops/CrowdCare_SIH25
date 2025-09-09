#!/usr/bin/env python3
"""
Fix database schema issues for the department system
"""

import os
import sys
import sqlite3

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def check_database_schema():
    """Check the current database schema"""
    try:
        # Connect to the database
        conn = sqlite3.connect('crowdcare.db')
        cursor = conn.cursor()
        
        print("🔍 Checking current database schema...")
        
        # Check if reports table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='reports'")
        if not cursor.fetchone():
            print("❌ Reports table does not exist!")
            return False
        
        # Check reports table structure
        cursor.execute("PRAGMA table_info(reports)")
        columns = cursor.fetchall()
        
        print("\n📋 Current reports table columns:")
        required_columns = [
            'resolved_by', 'resolved_at', 'resolution_image_url', 'resolution_coordinates'
        ]
        
        existing_columns = [col[1] for col in columns]
        
        for col in columns:
            print(f"   • {col[1]} ({col[2]})")
        
        # Check for missing columns
        missing_columns = []
        for col in required_columns:
            if col not in existing_columns:
                missing_columns.append(col)
        
        if missing_columns:
            print(f"\n❌ Missing columns: {', '.join(missing_columns)}")
            return False
        else:
            print("\n✅ All required columns exist!")
            return True
            
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

def fix_database_schema():
    """Fix the database schema by adding missing columns"""
    try:
        print("\n🔧 Fixing database schema...")
        
        # Connect to the database
        conn = sqlite3.connect('crowdcare.db')
        cursor = conn.cursor()
        
        # Add missing columns if they don't exist
        missing_columns = [
            ('resolved_by', 'TEXT'),
            ('resolved_at', 'DATETIME'),
            ('resolution_image_url', 'TEXT'),
            ('resolution_coordinates', 'TEXT')
        ]
        
        for col_name, col_type in missing_columns:
            try:
                cursor.execute(f"ALTER TABLE reports ADD COLUMN {col_name} {col_type}")
                print(f"✅ Added column: {col_name}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e):
                    print(f"ℹ️  Column already exists: {col_name}")
                else:
                    print(f"⚠️  Error adding column {col_name}: {e}")
        
        # Commit changes
        conn.commit()
        print("\n✅ Database schema updated!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error fixing database: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

def main():
    """Main function"""
    print("🔧 CrowdCare Database Schema Fix")
    print("=" * 50)
    
    # Check current schema
    if check_database_schema():
        print("\n🎉 Database schema is already correct!")
        return
    
    # Fix the schema
    if fix_database_schema():
        print("\n🔍 Verifying fix...")
        if check_database_schema():
            print("\n🎉 Database schema fixed successfully!")
            print("You can now restart the server and test report submission.")
        else:
            print("\n❌ Schema fix verification failed!")
    else:
        print("\n❌ Failed to fix database schema!")

if __name__ == "__main__":
    main()
