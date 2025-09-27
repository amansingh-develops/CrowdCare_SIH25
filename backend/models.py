from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, UniqueConstraint
from sqlalchemy.sql import func
from database import Base
import enum

class UserRole(enum.Enum):
    CITIZEN = "citizen"
    ADMIN = "admin"

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
        return (
            f"<FaceVerification(id={self.id}, report_id={self.report_id}, "
            f"admin_id='{self.admin_id}', citizen_id='{self.citizen_id}')>"
        )

# SQLAlchemy models for main application
class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    mobile_number = Column(String(20))
    role = Column(String(20), nullable=False, default="citizen")  # citizen or admin
    
    # Admin-specific fields
    admin_id = Column(String(50))
    municipality_name = Column(String(255))
    department_name = Column(String(255))
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<User(id='{self.id}', email='{self.email}', role='{self.role}')>"

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    category = Column(String(100), nullable=False)
    image_url = Column(String(500))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # AI-generated fields
    ai_generated_title = Column(String(500))
    ai_generated_description = Column(Text)
    ai_tags = Column(Text)  # JSON string
    
    # Urgency classification
    urgency_score = Column(Float, default=50.0)
    urgency_label = Column(String(20), default="Medium")
    
    # MCQ responses
    mcq_responses = Column(Text)  # JSON string
    
    # Reporter information
    reporter_id = Column(String(36), nullable=False, index=True)
    
    # Enhanced status tracking with stages
    status = Column(String(20), default="reported")  # reported, acknowledged, in_progress, resolved, deleted
    admin_notes = Column(Text)
    
    # Deletion tracking
    is_deleted = Column(Boolean, default=False)
    deletion_reason = Column(String(255))
    deleted_at = Column(DateTime(timezone=True))
    
    # Enhanced resolution tracking
    resolved_by = Column(String(36))
    resolved_at = Column(DateTime(timezone=True))
    resolution_image_url = Column(String(500))
    resolution_coordinates = Column(Text)  # JSON string
    
    # Timestamps for each status stage
    reported_at = Column(DateTime(timezone=True), server_default=func.now())
    acknowledged_at = Column(DateTime(timezone=True))
    in_progress_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Report(id={self.id}, title='{self.title}', status='{self.status}')>"

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(36), nullable=False, index=True)
    token = Column(String(500), nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<RefreshToken(id={self.id}, user_id='{self.user_id}')>"