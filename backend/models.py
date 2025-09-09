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

class DepartmentCategory(Base):
    __tablename__ = "department_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # e.g., "Garbage", "Roads", "Water"
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<DepartmentCategory(id={self.id}, name='{self.name}')>"

class CategoryDepartmentMapping(Base):
    __tablename__ = "category_department_mappings"
    
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=False)  # e.g., "Garbage", "Pothole"
    department_name = Column(String(100), nullable=False)  # e.g., "Garbage", "Roads"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<CategoryDepartmentMapping(category='{self.category}', department='{self.department_name}')>"

class CitizenReply(Base):
    __tablename__ = "citizen_replies"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_admin_reply = Column(Boolean, default=False)
    admin_name = Column(String(255))  # Name of admin who replied
    
    def __repr__(self):
        return f"<CitizenReply(id={self.id}, report_id={self.report_id}, is_admin={self.is_admin_reply})>"

class ReportRating(Base):
    __tablename__ = "report_ratings"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    feedback = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ReportRating(id={self.id}, report_id={self.report_id}, rating={self.rating})>"

class ReportDeletion(Base):
    __tablename__ = "report_deletions"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    deleted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ReportDeletion(id={self.id}, report_id={self.report_id}, reason='{self.reason}')>"

class ReportStatusHistory(Base):
    __tablename__ = "report_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False)  # reported, acknowledged, in_progress, resolved
    changed_by = Column(String(36))  # User ID who changed the status
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text)  # Optional notes about the status change
    
    def __repr__(self):
        return f"<ReportStatusHistory(id={self.id}, report_id={self.report_id}, status='{self.status}')>"

# Community features: Upvotes and Comments
class ReportUpvote(Base):
    __tablename__ = "report_upvotes"
    __table_args__ = (
        UniqueConstraint("report_id", "user_id", name="uq_report_upvote"),
    )

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<ReportUpvote(id={self.id}, report_id={self.report_id}, user_id='{self.user_id}')>"


class ReportComment(Base):
    __tablename__ = "report_comments"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<ReportComment(id={self.id}, report_id={self.report_id}, user_id='{self.user_id}')>"


class AdminVerification(Base):
    __tablename__ = "admin_verifications"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, nullable=False, index=True)
    admin_id = Column(String(36), nullable=False, index=True)
    verification_image_url = Column(String(500), nullable=False)
    captured_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return (
            f"<AdminVerification(id={self.id}, report_id={self.report_id}, "
            f"admin_id='{self.admin_id}')>"
        )


class FaceVerification(Base):
    __tablename__ = "face_verifications"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, nullable=False, index=True)
    # Support both admins and citizens; one of these will be set
    admin_id = Column(String(36), nullable=True, index=True)
    citizen_id = Column(String(36), nullable=True, index=True)
    image_url = Column(String(500), nullable=False)
    face_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        who = self.admin_id or self.citizen_id or "unknown"
        return f"<FaceVerification(id={self.id}, report_id={self.report_id}, user='{who}', verified={self.face_verified})>"