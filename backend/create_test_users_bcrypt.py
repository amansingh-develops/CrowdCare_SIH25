#!/usr/bin/env python3
"""
Script to create test users for CrowdCare system using bcrypt (matching auth service)
"""

import sqlite3
import bcrypt
import uuid
from datetime import datetime

def hash_password_bcrypt(password: str) -> str:
    """Hash password using bcrypt (matching auth service)"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_test_users():
    """Create test citizen and admin users with bcrypt hashing"""
    
    # Connect to database
    conn = sqlite3.connect('crowdcare.db')
    cursor = conn.cursor()
    
    try:
        # Test citizen user
        citizen_id = str(uuid.uuid4())
        citizen_password_hash = hash_password_bcrypt("testpassword123")
        
        cursor.execute("""
            INSERT OR REPLACE INTO users (
                id, email, password_hash, full_name, mobile_number, role, 
                is_active, is_verified, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            citizen_id,
            "test@example.com",
            citizen_password_hash,
            "Test Citizen",
            "1234567890",
            "citizen",
            True,
            True,
            datetime.utcnow().isoformat(),
            datetime.utcnow().isoformat()
        ))
        
        print("✅ Test citizen user created:")
        print(f"   Email: test@example.com")
        print(f"   Password: testpassword123")
        print(f"   ID: {citizen_id}")
        
        # Test admin user
        admin_id = str(uuid.uuid4())
        admin_password_hash = hash_password_bcrypt("adminpassword123")
        
        cursor.execute("""
            INSERT OR REPLACE INTO users (
                id, email, password_hash, full_name, mobile_number, role,
                admin_id, municipality_name, department_name,
                is_active, is_verified, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            admin_id,
            "admin@example.com",
            admin_password_hash,
            "Test Admin",
            "0987654321",
            "admin",
            "ADMIN001",
            "Test City",
            "Public Works",
            True,
            True,
            datetime.utcnow().isoformat(),
            datetime.utcnow().isoformat()
        ))
        
        print("✅ Test admin user created:")
        print(f"   Email: admin@example.com")
        print(f"   Password: adminpassword123")
        print(f"   ID: {admin_id}")
        
        # Commit changes
        conn.commit()
        print("\n🎉 Test users created successfully with bcrypt hashing!")
        
    except Exception as e:
        print(f"❌ Error creating test users: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_test_users()
