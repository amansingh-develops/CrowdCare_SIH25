#!/usr/bin/env python3
"""
Recreate database with new schema for department system
"""

import os
import sys

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from models import Base

def recreate_database():
    """Drop and recreate all database tables"""
    try:
        print("🗑️  Dropping existing database tables...")
        
        # Drop all tables
        Base.metadata.drop_all(bind=engine)
        print("✅ All tables dropped")
        
        print("🏗️  Creating new database tables...")
        
        # Create all tables with new schema
        Base.metadata.create_all(bind=engine)
        print("✅ New database tables created")
        
        print("🎯 Database schema updated successfully!")
        print("   - Added resolution tracking fields to reports table")
        print("   - Added department categories table")
        print("   - Added category-department mappings table")
        
        return True
        
    except Exception as e:
        print(f"❌ Error recreating database: {e}")
        return False

if __name__ == "__main__":
    print("CrowdCare Database Recreation Script")
    print("=" * 50)
    
    # Confirm action
    print("⚠️  WARNING: This will delete ALL existing data!")
    confirm = input("Are you sure you want to continue? (yes/no): ").strip().lower()
    
    if confirm == "yes":
        success = recreate_database()
        if success:
            print("\n🎉 Database recreated successfully!")
            print("Next steps:")
            print("1. Run: python init_departments.py")
            print("2. Run: python create_test_admin.py")
            print("3. Start server: python run.py")
        else:
            print("\n❌ Database recreation failed!")
    else:
        print("❌ Operation cancelled by user")
