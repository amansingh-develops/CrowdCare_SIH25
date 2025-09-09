#!/usr/bin/env python3
"""
Create a test admin user for Garbage department
"""

import sys
import os
import hashlib
import uuid

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db, engine
from models import Base, User, DepartmentCategory
from sqlalchemy.orm import Session

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_test_admin():
    """Create a test admin user for Garbage department"""
    try:
        print("🚀 Creating test admin user for Garbage department...")
        
        # Get database session
        db = next(get_db())
        
        # Check if department exists
        department = db.query(DepartmentCategory).filter(
            DepartmentCategory.name == "Garbage"
        ).first()
        
        if not department:
            print("❌ Garbage department not found!")
            return False
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == "garbage.admin@test.com").first()
        if existing_user:
            print("✅ Test admin user already exists!")
            print(f"   Email: {existing_user.email}")
            print(f"   Password: test123456")
            print(f"   Department: {existing_user.department_name}")
            return True
        
        # Create admin user
        admin_user = User(
            id=str(uuid.uuid4()),
            email="garbage.admin@test.com",
            password_hash=hash_password("test123456"),
            full_name="Garbage Department Admin",
            mobile_number="9876543210",
            role="admin",
            admin_id=f"ADMIN_{uuid.uuid4().hex[:8].upper()}",
            municipality_name="Test Municipality",
            department_name="Garbage",
            is_active=True,
            is_verified=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("✅ Test admin user created successfully!")
        print(f"   Email: {admin_user.email}")
        print(f"   Password: test123456")
        print(f"   Name: {admin_user.full_name}")
        print(f"   Department: {admin_user.department_name}")
        print(f"   Admin ID: {admin_user.admin_id}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating test admin: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    create_test_admin()
