from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from typing import Optional
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# MongoDB connection (disabled for now - using SQLite)
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "crowdcare")

# MongoDB clients (disabled for now)
async_client = None
async_db = None
sync_client = None
sync_db = None

# Collections (disabled for now)
reports_collection = None
users_collection = None
refresh_tokens_collection = None
department_categories_collection = None
category_department_mappings_collection = None
citizen_replies_collection = None
report_ratings_collection = None
report_deletions_collection = None
report_status_history_collection = None
report_upvotes_collection = None
report_comments_collection = None
admin_verifications_collection = None
face_verifications_collection = None

# SQLAlchemy configuration for SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./crowdcare.db")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    poolclass=StaticPool if "sqlite" in DATABASE_URL else None,
    echo=False
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for SQLAlchemy models
Base = declarative_base()

# Dependency to get database
async def get_database():
    return async_db

# Dependency to get sync database
def get_sync_database():
    return sync_db

# Dependency to get SQLAlchemy database session
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
