#!/usr/bin/env python3
"""
Check database connection status for CrowdCare
"""

import os
import sys
from datetime import datetime

def check_environment():
    """Check environment variables"""
    print("🔍 Checking Environment Variables...")
    print("=" * 50)
    
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_db = os.getenv("MONGODB_DB", "crowdcare")
    
    print(f"MONGODB_URI: {mongodb_uri}")
    print(f"MONGODB_DB: {mongodb_db}")
    
    if mongodb_uri == "mongodb://localhost:27017":
        print("⚠️  Using default local MongoDB URI")
        print("💡 To use MongoDB Atlas, set MONGODB_URI environment variable")
    else:
        print("✅ Custom MongoDB URI configured")
    
    return mongodb_uri, mongodb_db

def test_mongodb_connection():
    """Test MongoDB connection"""
    print("\n🍃 Testing MongoDB Connection...")
    print("=" * 50)
    
    try:
        from pymongo import MongoClient
        from motor.motor_asyncio import AsyncIOMotorClient
        import asyncio
        
        mongodb_uri, mongodb_db = check_environment()
        
        # Test sync connection
        print("🔄 Testing sync connection...")
        try:
            client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
            client.admin.command('ping')
            print("✅ Sync MongoDB connection successful!")
            client.close()
        except Exception as e:
            print(f"❌ Sync connection failed: {e}")
            return False
        
        # Test async connection
        print("🔄 Testing async connection...")
        try:
            async def test_async():
                client = AsyncIOMotorClient(mongodb_uri, serverSelectionTimeoutMS=5000)
                await client.admin.command('ping')
                print("✅ Async MongoDB connection successful!")
                client.close()
                return True
            
            result = asyncio.run(test_async())
            return result
            
        except Exception as e:
            print(f"❌ Async connection failed: {e}")
            return False
            
    except ImportError as e:
        print(f"❌ Missing dependencies: {e}")
        print("💡 Run: pip install motor pymongo")
        return False

def check_node_dependencies():
    """Check Node.js dependencies"""
    print("\n📦 Checking Node.js Dependencies...")
    print("=" * 50)
    
    try:
        import json
        with open('package.json', 'r') as f:
            package_data = json.load(f)
        
        dependencies = package_data.get('dependencies', {})
        
        if 'mongodb' in dependencies:
            print("✅ MongoDB package found in package.json")
        else:
            print("❌ MongoDB package not found in package.json")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Error reading package.json: {e}")
        return False

def main():
    """Main function"""
    print("🔍 CrowdCare Database Connection Check")
    print("=" * 60)
    print(f"⏰ Check time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check environment
    mongodb_uri, mongodb_db = check_environment()
    
    # Check Node.js dependencies
    node_ok = check_node_dependencies()
    
    # Test MongoDB connection
    mongo_ok = test_mongodb_connection()
    
    # Summary
    print("\n📋 Connection Status Summary")
    print("=" * 50)
    print(f"Environment Variables: {'✅ OK' if mongodb_uri else '❌ Missing'}")
    print(f"Node.js Dependencies: {'✅ OK' if node_ok else '❌ Missing'}")
    print(f"MongoDB Connection: {'✅ OK' if mongo_ok else '❌ Failed'}")
    
    if mongo_ok:
        print("\n🎉 Database connection is working!")
        print("🚀 Your CrowdCare app is ready to use MongoDB!")
    else:
        print("\n⚠️  Database connection issues detected")
        print("\n💡 Solutions:")
        print("   1. Install MongoDB locally: https://www.mongodb.com/try/download/community")
        print("   2. Or use MongoDB Atlas: https://www.mongodb.com/atlas")
        print("   3. Set MONGODB_URI environment variable")
        print("   4. Install dependencies: pip install motor pymongo")

if __name__ == "__main__":
    main()
