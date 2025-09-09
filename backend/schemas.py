from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any, Literal, List, Union
from datetime import datetime
from fastapi import UploadFile, File
import uuid

class ReportCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: str = Field(..., min_length=1, max_length=100)
    image_url: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    mcq_responses: Optional[Dict[str, Any]] = None

class ReportResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: str
    image_url: Optional[str] = None
    latitude: float
    longitude: float
    
    # AI-generated fields
    ai_generated_title: Optional[str] = None
    ai_generated_description: Optional[str] = None
    ai_tags: Optional[str] = None
    
    # Urgency classification
    urgency_score: float
    urgency_label: str
    
    # MCQ responses
    mcq_responses: Optional[str] = None
    
    # Reporter information
    reporter_id: str
    
    # Enhanced status tracking
    status: str
    admin_notes: Optional[str] = None
    status_history: Optional[str] = None
    
    # Resolution tracking
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_image_url: Optional[str] = None
    resolution_coordinates: Optional[str] = None
    # Rating (citizen feedback) summary
    rating: Optional[int] = None
    rating_feedback: Optional[str] = None
    
    # Status stage timestamps
    reported_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    in_progress_at: Optional[datetime] = None
    
    # Deletion tracking
    is_deleted: Optional[bool] = False
    deletion_reason: Optional[str] = None
    deleted_at: Optional[datetime] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# User Authentication Schemas
class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    mobile_number: str = Field(..., min_length=10, max_length=20)
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    role: Literal["citizen", "admin"]

class CitizenRegister(UserRegister):
    role: Literal["citizen", "admin"] = "citizen"

class AdminRegister(UserRegister):
    role: Literal["citizen", "admin"] = "admin"
    admin_id: str = Field(..., min_length=1, max_length=100)
    municipality_name: Optional[str] = Field(None, max_length=255)
    department_name: Optional[str] = Field(None, max_length=255)

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: Literal["citizen", "admin"]

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    mobile_number: Optional[str]
    role: Literal["citizen", "admin"]
    admin_id: Optional[str]
    municipality_name: Optional[str]
    department_name: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    mobile_number: Optional[str] = Field(None, min_length=10, max_length=20)

# AI Service Schemas
class AISummaryRequest(BaseModel):
    category: str
    reporting_time: str
    latitude: float
    longitude: float
    mcq_responses: Dict[str, Any]
    image_description: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None

class AISummaryResponse(BaseModel):
    title: str
    description: str
    tags: Optional[list] = None

class AIClassificationRequest(BaseModel):
    title: str
    description: str
    category: str
    mcq_responses: Dict[str, Any]
    latitude: float
    longitude: float
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None
    reporting_time: Optional[str] = None
    image_description: Optional[str] = None

class AIClassificationResponse(BaseModel):
    urgency_score: int
    urgency_label: str
    reasoning: Optional[str] = None

# Legacy schemas for backward compatibility
class ReportData(BaseModel):
    id: uuid.UUID
    title: str
    latitude: float
    longitude: float
    image_url: str

class ErrorResponse(BaseModel):
    detail: str

# Report Resolution Schemas
class ReportResolutionRequest(BaseModel):
    report_id: int
    admin_notes: Optional[str] = None
    resolution_image: UploadFile = File(...)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

class ReportResolutionResponse(BaseModel):
    success: bool
    message: str
    report_id: int
    resolution_coordinates: str

# Department Management Schemas
class DepartmentCategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class CategoryDepartmentMappingResponse(BaseModel):
    id: int
    category: str
    department_name: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Citizen Reply Schemas
class CitizenReplyCreate(BaseModel):
    report_id: int
    message: str
    is_admin_reply: bool = False

class CitizenReplyResponse(BaseModel):
    id: int
    report_id: int
    message: str
    created_at: datetime
    is_admin_reply: bool
    admin_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# Rating Schemas
class ReportRatingCreate(BaseModel):
    report_id: int
    rating: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None

class ReportRatingResponse(BaseModel):
    id: int
    report_id: int
    rating: int
    feedback: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Report Deletion Schema
class ReportDeletionRequest(BaseModel):
    report_id: int
    reason: str

# Status Tracking Schemas
class StatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(reported|acknowledged|in_progress|resolved)$")
    notes: Optional[str] = None

class StatusHistoryResponse(BaseModel):
    id: int
    report_id: int
    status: str
    changed_by: Optional[str] = None
    changed_at: datetime
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True

# Enhanced Resolution Schemas
class ReportResolutionRequest(BaseModel):
    report_id: int
    admin_notes: Optional[str] = None
    resolution_image: UploadFile = File(...)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

class ReportResolutionResponse(BaseModel):
    success: bool
    message: str
    report_id: int
    status: str
    resolved_at: datetime
    evidence_url: str
    admin_coordinates: Dict[str, float]
    distance_verified: bool
    distance_meters: float
    admin_id: str
    admin_verification_image_url: Optional[str] = None

# Community schemas
class CommunityReport(BaseModel):
    id: int
    title: str
    category: str
    reporter_name: Optional[str] = None
    status: str
    upvotes: int
    comments_count: int
    urgency_score: float
    created_at: datetime
    ai_generated_title: Optional[str] = None
    ai_generated_description: Optional[str] = None
    image_url: Optional[str] = None
    user_has_upvoted: Optional[bool] = False

class UpvoteResponse(BaseModel):
    message: str
    total_upvotes: int
    user_has_upvoted: bool

class CommentCreate(BaseModel):
    comment: str = Field(..., min_length=1)

class CommentResponse(BaseModel):
    id: int
    report_id: int
    user_id: str
    user_name: Optional[str] = None
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True

# Duplicate detection responses for report creation
class ExistingReportSummary(BaseModel):
    id: int
    title: str
    category: str
    status: str
    latitude: float
    longitude: float
    upvotes: int
    comments: int

class ReportCreateDuplicateResponse(BaseModel):
    duplicate: Literal[True]
    message: str
    existing_report: ExistingReportSummary

class ReportCreateSuccessData(BaseModel):
    id: int
    title: str
    status: str
    latitude: float
    longitude: float

class ReportCreateSuccessResponse(BaseModel):
    duplicate: Literal[False]
    message: str
    data: ReportCreateSuccessData

ReportCreateAPIResponse = Union[ReportCreateDuplicateResponse, ReportCreateSuccessResponse]


# Face verification schemas
class FaceVerifyRequest(BaseModel):
    image_base64: str
    report_id: int
    admin_id: Optional[str] = None
    citizen_id: Optional[str] = None

class InstantFaceVerifyRequest(BaseModel):
    image_base64: str

class FaceVerifyResponse(BaseModel):
    success: bool
    face_detected: bool
    openai_human: bool
    image_url: Optional[str] = None
    verified_at: Optional[datetime] = None