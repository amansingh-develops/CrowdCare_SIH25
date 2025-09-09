from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from typing import Optional
import os

# MongoDB connection
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "crowdcare")

# Async MongoDB client for FastAPI
async_client = AsyncIOMotorClient(MONGODB_URI)
async_db = async_client[MONGODB_DB]

# Sync MongoDB client for background tasks
sync_client = MongoClient(MONGODB_URI)
sync_db = sync_client[MONGODB_DB]

# Collections
reports_collection = async_db.reports
users_collection = async_db.users
refresh_tokens_collection = async_db.refresh_tokens
department_categories_collection = async_db.department_categories
category_department_mappings_collection = async_db.category_department_mappings
citizen_replies_collection = async_db.citizen_replies
report_ratings_collection = async_db.report_ratings
report_deletions_collection = async_db.report_deletions
report_status_history_collection = async_db.report_status_history
report_upvotes_collection = async_db.report_upvotes
report_comments_collection = async_db.report_comments
admin_verifications_collection = async_db.admin_verifications
face_verifications_collection = async_db.face_verifications

# Dependency to get database
async def get_database():
    return async_db

# Dependency to get sync database
def get_sync_database():
    return sync_db
