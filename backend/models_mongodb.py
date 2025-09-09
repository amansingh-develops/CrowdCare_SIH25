from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
import enum

class UserRole(enum.Enum):
    CITIZEN = "citizen"
    ADMIN = "admin"

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class Report(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    title: str
    description: Optional[str] = None
    category: str
    image_url: Optional[str] = None
    latitude: float
    longitude: float
    
    # AI-generated fields
    ai_generated_title: Optional[str] = None
    ai_generated_description: Optional[str] = None
    ai_tags: Optional[List[str]] = None
    
    # Urgency classification
    urgency_score: float = 50.0
    urgency_label: str = "Medium"
    
    # MCQ responses
    mcq_responses: Optional[Dict[str, Any]] = None
    
    # Reporter information
    reporter_id: str
    
    # Enhanced status tracking with stages
    status: str = "reported"  # reported, acknowledged, in_progress, resolved, deleted
    admin_notes: Optional[str] = None
    
    # Status history tracking
    status_history: Optional[List[Dict[str, Any]]] = None
    
    # Deletion tracking
    is_deleted: bool = False
    deletion_reason: Optional[str] = None
    deleted_at: Optional[datetime] = None
    
    # Enhanced resolution tracking
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_image_url: Optional[str] = None
    resolution_coordinates: Optional[Dict[str, Any]] = None
    
    # Timestamps for each status stage
    reported_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged_at: Optional[datetime] = None
    in_progress_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class User(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    email: str
    password_hash: str
    full_name: str
    mobile_number: Optional[str] = None
    role: str  # citizen or admin
    
    # Admin-specific fields
    admin_id: Optional[str] = None
    municipality_name: Optional[str] = None
    department_name: Optional[str] = None
    
    # Account status
    is_active: bool = True
    is_verified: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class RefreshToken(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class DepartmentCategory(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class CategoryDepartmentMapping(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    category: str
    department_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class CitizenReply(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    report_id: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_admin_reply: bool = False
    admin_name: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ReportRating(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    report_id: str
    rating: int  # 1-5 stars
    feedback: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ReportDeletion(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    report_id: str
    reason: str
    deleted_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ReportStatusHistory(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    report_id: str
    status: str  # reported, acknowledged, in_progress, resolved
    changed_by: Optional[str] = None
    changed_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ReportUpvote(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    report_id: str
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ReportComment(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    report_id: str
    user_id: str
    comment: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class AdminVerification(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    report_id: str
    admin_id: str
    verification_image_url: str
    captured_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class FaceVerification(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    report_id: str
    admin_id: Optional[str] = None
    citizen_id: Optional[str] = None
    image_url: str
    face_verified: bool = False
    verified_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
