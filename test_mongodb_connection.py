#!/usr/bin/env python3
"""
Test MongoDB connection for CrowdCare application
"""

import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from datetime import datetime

async def test_async_connection():
    """Test async MongoDB connection"""
    try:
        # Get MongoDB URI from environment or use default
        mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        mongodb_db = os.getenv("MONGODB_DB", "crowdcare")
        
        print(f"🔗 Connecting to MongoDB: {mongodb_uri}")
        print(f"📊 Database: {mongodb_db}")
        
        # Test async connection
        client = AsyncIOMotorClient(mongodb_uri)
        db = client[mongodb_db]
        
        # Test connection
        await client.admin.command('ping')
        print("✅ Async MongoDB connection successful!")
        
        # Test database operations
        collection = db.test_collection
        test_doc = {
            "test": True,
            "timestamp": datetime.utcnow(),
            "message": "MongoDB connection test"
        }
        
        # Insert test document
        result = await collection.insert_one(test_doc)
        print(f"✅ Test document inserted with ID: {result.inserted_id}")
        
        # Find test document
        found_doc = await collection.find_one({"_id": result.inserted_id})
        print(f"✅ Test document found: {found_doc}")
        
        # Clean up test document
        await collection.delete_one({"_id": result.inserted_id})
        print("✅ Test document cleaned up")
        
        # Close connection
        client.close()
        print("✅ Async connection closed")
        
        return True
        
    except Exception as e:
        print(f"❌ Async MongoDB connection failed: {e}")
        return False

def test_sync_connection():
    """Test sync MongoDB connection"""
    try:
        # Get MongoDB URI from environment or use default
        mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        mongodb_db = os.getenv("MONGODB_DB", "crowdcare")
        
        print(f"🔗 Connecting to MongoDB (sync): {mongodb_uri}")
        print(f"📊 Database: {mongodb_db}")
        
        # Test sync connection
        client = MongoClient(mongodb_uri)
        db = client[mongodb_db]
        
        # Test connection
        client.admin.command('ping')
        print("✅ Sync MongoDB connection successful!")
        
        # Test database operations
        collection = db.test_collection
        test_doc = {
            "test": True,
            "timestamp": datetime.utcnow(),
            "message": "MongoDB sync connection test"
        }
        
        # Insert test document
        result = collection.insert_one(test_doc)
        print(f"✅ Test document inserted with ID: {result.inserted_id}")
        
        # Find test document
        found_doc = collection.find_one({"_id": result.inserted_id})
        print(f"✅ Test document found: {found_doc}")
        
        # Clean up test document
        collection.delete_one({"_id": result.inserted_id})
        print("✅ Test document cleaned up")
        
        # Close connection
        client.close()
        print("✅ Sync connection closed")
        
        return True
        
    except Exception as e:
        print(f"❌ Sync MongoDB connection failed: {e}")
        return False

async def main():
    """Main test function"""
    print("🍃 MongoDB Connection Test for CrowdCare")
    print("=" * 50)
    
    # Test async connection
    print("\n🔄 Testing Async Connection...")
    async_success = await test_async_connection()
    
    # Test sync connection
    print("\n🔄 Testing Sync Connection...")
    sync_success = test_sync_connection()
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Test Summary:")
    print(f"   Async Connection: {'✅ PASS' if async_success else '❌ FAIL'}")
    print(f"   Sync Connection:  {'✅ PASS' if sync_success else '❌ FAIL'}")
    
    if async_success and sync_success:
        print("\n🎉 All MongoDB connections successful!")
        print("🚀 Your CrowdCare app is ready to use MongoDB!")
    else:
        print("\n⚠️  Some connections failed. Please check your MongoDB setup.")
        print("\n💡 Setup Instructions:")
        print("   1. Install MongoDB locally or use MongoDB Atlas")
        print("   2. Set MONGODB_URI environment variable")
        print("   3. Ensure MongoDB is running and accessible")

if __name__ == "__main__":
    asyncio.run(main())
