#!/usr/bin/env python3
"""
Initialize departments and category mappings for CrowdCare
Run this script after starting the server to set up the department system
"""

import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db, engine
from models import Base, DepartmentCategory, CategoryDepartmentMapping
from services.department_service import department_service

async def init_departments():
    """Initialize departments and category mappings"""
    try:
        print("🚀 Initializing CrowdCare Department System...")
        
        # Create database tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created")
        
        # Get database session
        db = next(get_db())
        
        # Initialize departments
        success = await department_service.initialize_departments(db)
        
        if success:
            print("✅ Departments and category mappings initialized successfully!")
            
            # Display what was created
            print("\n📋 Created Departments:")
            depts = db.query(DepartmentCategory).all()
            for dept in depts:
                print(f"  • {dept.name}: {dept.description}")
            
            print("\n🔗 Category-Department Mappings:")
            mappings = db.query(CategoryDepartmentMapping).all()
            for mapping in mappings:
                print(f"  • {mapping.category} → {mapping.department_name}")
            
            print(f"\n🎉 Total: {len(depts)} departments, {len(mappings)} mappings")
            
        else:
            print("❌ Failed to initialize departments")
            return False
            
    except Exception as e:
        print(f"❌ Error initializing departments: {e}")
        return False
    finally:
        db.close()
    
    return True

if __name__ == "__main__":
    print("CrowdCare Department Initialization Script")
    print("=" * 50)
    
    success = asyncio.run(init_departments())
    
    if success:
        print("\n🎯 Next Steps:")
        print("1. Start the backend server: python run.py")
        print("2. Create an admin user with department assignment")
        print("3. Test the department-based admin panel")
    else:
        print("\n❌ Initialization failed. Check the error messages above.")
        sys.exit(1)
