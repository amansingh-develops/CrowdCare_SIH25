#!/usr/bin/env python3
"""
Create an admin user with department assignment for CrowdCare
"""

import asyncio
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

def create_admin_user(db: Session, email: str, password: str, full_name: str, 
                     department_name: str, mobile_number: str = None) -> User:
    """Create an admin user with department assignment"""
    
    # Check if department exists
    department = db.query(DepartmentCategory).filter(
        DepartmentCategory.name == department_name
    ).first()
    
    if not department:
        print(f"❌ Department '{department_name}' not found!")
        print("Available departments:")
        depts = db.query(DepartmentCategory).all()
        for dept in depts:
            print(f"  • {dept.name}")
        return None
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        print(f"❌ User with email '{email}' already exists!")
        return None
    
    # Create admin user
    admin_user = User(
        id=str(uuid.uuid4()),
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        mobile_number=mobile_number,
        role="admin",
        admin_id=f"ADMIN_{uuid.uuid4().hex[:8].upper()}",
        municipality_name="Default Municipality",
        department_name=department_name,
        is_active=True,
        is_verified=True
    )
    
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    return admin_user

def main():
    print("CrowdCare Admin User Creation")
    print("=" * 40)
    
    # Get user input
    email = input("Enter admin email: ").strip()
    if not email:
        print("❌ Email is required!")
        return
    
    password = input("Enter admin password (min 8 chars): ").strip()
    if len(password) < 8:
        print("❌ Password must be at least 8 characters!")
        return
    
    full_name = input("Enter admin full name: ").strip()
    if not full_name:
        print("❌ Full name is required!")
        return
    
    # Show available departments
    print("\nAvailable departments:")
    db = next(get_db())
    try:
        depts = db.query(DepartmentCategory).all()
        for i, dept in enumerate(depts, 1):
            print(f"  {i}. {dept.name}: {dept.description}")
        
        dept_choice = input(f"\nSelect department (1-{len(depts)}): ").strip()
        try:
            dept_index = int(dept_choice) - 1
            if 0 <= dept_index < len(depts):
                department_name = depts[dept_index].name
            else:
                print("❌ Invalid department choice!")
                return
        except ValueError:
            print("❌ Please enter a valid number!")
            return
        
        mobile_number = input("Enter mobile number (optional): ").strip() or None
        
        # Create admin user
        print(f"\n🚀 Creating admin user for department: {department_name}")
        admin_user = create_admin_user(db, email, password, full_name, department_name, mobile_number)
        
        if admin_user:
            print("✅ Admin user created successfully!")
            print(f"   ID: {admin_user.id}")
            print(f"   Email: {admin_user.email}")
            print(f"   Name: {admin_user.full_name}")
            print(f"   Department: {admin_user.department_name}")
            print(f"   Admin ID: {admin_user.admin_id}")
            print(f"   Role: {admin_user.role}")
            print(f"   Status: {'Active' if admin_user.is_active else 'Inactive'}")
            print(f"   Verified: {'Yes' if admin_user.is_verified else 'No'}")
            
            print("\n🎯 You can now:")
            print("1. Login to the admin panel with these credentials")
            print("2. View issues specific to your department")
            print("3. Resolve reports with coordinate verification")
        else:
            print("❌ Failed to create admin user!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
