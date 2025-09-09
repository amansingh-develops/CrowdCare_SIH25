from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import json
from typing import Optional, List
from sqlalchemy import func
import logging
from datetime import datetime, timezone

from database import get_db, engine
from models import Base
from services.exif_service import extract_gps_from_image
from services.storage_service import upload_image_to_storage
from services.report_service import create_report
from services.ai_service import ai_service
from services.department_service import department_service
from services.resolution_service import resolution_service
from services.status_service import status_service
from websocket_manager import websocket_manager
from services.gamification_service import get_gamification_profile, maybe_emit_badge_unlocks
from schemas import (
    ReportCreate, ReportResponse, ErrorResponse, AISummaryRequest, AIClassificationRequest,
    CitizenReplyCreate, CitizenReplyResponse, ReportRatingCreate, ReportRatingResponse,
    ReportDeletionRequest, StatusUpdateRequest, StatusHistoryResponse, 
    ReportResolutionRequest, ReportResolutionResponse,
    CommunityReport, UpvoteResponse, CommentCreate, CommentResponse,
    ReportCreateAPIResponse, ExistingReportSummary,
    FaceVerifyRequest, FaceVerifyResponse, InstantFaceVerifyRequest
)
from routes.auth import router as auth_router
from routes.auth import get_current_user, get_current_admin
from models import User, CitizenReply, ReportRating, ReportDeletion, Report, ReportUpvote, ReportComment
from services.face_verification_service import face_verification_service
from services.storage_service import storage_service
from models import FaceVerification

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="CrowdCare API",
    description="Backend API for CrowdCare issue reporting system with AI assistance",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication routes
app.include_router(auth_router)

# Mount static files for uploaded images
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Create database tables
Base.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    return {"message": "CrowdCare API v2.0 is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "CrowdCare API v2.0 is running"}

# Gamification profile
@app.get("/gamification/profile")
async def gamification_profile(
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        profile = get_gamification_profile(db, current_user)
        # Provide a friendly avatar fallback
        if not profile["user"].get("avatar"):
            initials = (current_user.full_name or current_user.email or "U").strip()[:2].upper()
            profile["user"]["avatar"] = f"https://api.dicebear.com/7.x/initials/svg?seed={initials}"
        return profile
    except Exception as e:
        logger.error(f"Error building gamification profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while building gamification profile")

# WebSocket endpoint for real-time updates
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time status updates"""
    await websocket_manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "subscribe_reports":
                # Subscribe to specific report updates
                report_ids = message.get("report_ids", [])
                for report_id in report_ids:
                    if report_id not in websocket_manager.report_connections:
                        websocket_manager.report_connections[report_id] = set()
                    websocket_manager.report_connections[report_id].add(websocket)
                
                await websocket_manager.send_personal_message(
                    json.dumps({"type": "subscribed", "report_ids": report_ids}),
                    websocket
                )
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        websocket_manager.disconnect(websocket, user_id)

# Gamification WebSocket stream
@app.websocket("/gamification/stream")
async def gamification_stream(websocket: WebSocket):
    """WebSocket stream for gamification events (points, badges, streaks)."""
    await websocket.accept()
    # user_id via query string
    user_id = websocket.query_params.get("user_id")
    if not user_id:
        await websocket.close()
        return
    try:
        await websocket_manager.connect(websocket, user_id)
        await websocket_manager.send_personal_message(
            json.dumps({"type": "hello", "channel": "gamification", "connected": True}),
            websocket,
        )
        while True:
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"Gamification WebSocket error for user {user_id}: {e}")
        websocket_manager.disconnect(websocket, user_id)

# Helper: consistently serialize datetimes as ISO 8601 with explicit UTC timezone
def to_iso_utc(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    try:
        # If datetime is naive, assume UTC; else convert to UTC
        if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
            return dt.replace(tzinfo=timezone.utc).isoformat()
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        try:
            # Best-effort fallback
            s = dt.isoformat()
            if s.endswith('Z') or ('+' in s[-6:] or '-' in s[-6:]):
                return s
            return s + 'Z'
        except Exception:
            return None

@app.post("/reports/create", response_model=ReportCreateAPIResponse)
async def create_issue_report(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form(...),
    image: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    mcq_responses: Optional[str] = Form(None),
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new issue report with image upload, GPS extraction, and AI assistance.
    
    - **title**: Short title of the issue
    - **description**: Optional description of the issue
    - **category**: Issue category (pothole, garbage, etc.)
    - **image**: Image file (JPEG/PNG)
    - **latitude**: Optional latitude (fallback if EXIF not available)
    - **longitude**: Optional longitude (fallback if EXIF not available)
    - **mcq_responses**: Optional JSON string of MCQ responses for AI enhancement
    """
    try:
        # Validate file type
        if not image.content_type or not image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (JPEG/PNG)"
            )
        
        # Validate file size (10MB limit)
        file_size = 0
        content = await image.read()
        file_size = len(content)
        
        if file_size > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(
                status_code=400,
                detail="File size must be less than 10MB"
            )
        
        # Reset file pointer
        await image.seek(0)
        
        # Extract GPS data from EXIF
        gps_data = None
        try:
            logger.info(f"Attempting to extract GPS from image, content size: {len(content)} bytes")
            gps_data = await extract_gps_from_image(content)
            logger.info(f"EXIF GPS data extracted: {gps_data}")
        except Exception as e:
            logger.warning(f"Failed to extract EXIF GPS data: {e}")
        
        # Use EXIF GPS data if available, otherwise use provided coordinates
        final_latitude = gps_data['latitude'] if gps_data else latitude
        final_longitude = gps_data['longitude'] if gps_data else longitude
        
        logger.info(f"Final coordinates - Latitude: {final_latitude}, Longitude: {final_longitude}")
        logger.info(f"Provided coordinates - Latitude: {latitude}, Longitude: {longitude}")
        
        if final_latitude is None or final_longitude is None:
            raise HTTPException(
                status_code=400,
                detail="GPS coordinates are required. Either provide them in the image EXIF data or as form parameters."
            )
        
        # Before any heavy work, check for duplicate existing reports within 30 meters and same category
        try:
            # Only consider active (non-deleted and not resolved) reports for duplication
            active_statuses = ["reported", "acknowledged", "in_progress"]
            candidates = db.query(Report).filter(
                Report.is_deleted == False,
                Report.status.in_(active_statuses)
            ).all()

            nearest = None
            nearest_distance = float('inf')

            # Use existing Haversine logic from resolution service
            normalized_new_cat = (category or "").strip().lower()
            for r in candidates:
                try:
                    # Categories must match (case-insensitive) to treat as duplicate
                    normalized_existing_cat = (r.category or "").strip().lower()
                    if normalized_existing_cat != normalized_new_cat:
                        continue

                    d = resolution_service.calculate_distance(
                        r.latitude, r.longitude, final_latitude, final_longitude
                    )
                    if d <= 30.0 and d < nearest_distance:
                        nearest = r
                        nearest_distance = d
                except Exception:
                    continue

            if nearest is not None:
                # Build counts
                upvotes_count = db.query(func.count(ReportUpvote.id)).filter(ReportUpvote.report_id == nearest.id).scalar() or 0
                comments_count = db.query(func.count(ReportComment.id)).filter(ReportComment.report_id == nearest.id).scalar() or 0

                return {
                    "duplicate": True,
                    "message": "This issue has already been reported nearby.",
                    "existing_report": {
                        "id": nearest.id,
                        "title": nearest.title,
                        "category": nearest.category,
                        "status": nearest.status,
                        "latitude": nearest.latitude,
                        "longitude": nearest.longitude,
                        "upvotes": upvotes_count,
                        "comments": comments_count,
                    }
                }
        except Exception as e:
            logger.warning(f"Duplicate detection failed, proceeding with creation: {e}")

        # Upload image to storage
        image_url = await upload_image_to_storage(image, content)
        
        # Parse MCQ responses
        mcq_data = {}
        if mcq_responses:
            try:
                mcq_data = json.loads(mcq_responses)
            except json.JSONDecodeError:
                logger.warning("Invalid MCQ responses JSON format")
                mcq_data = {}
        
        # Generate AI summary if MCQs are provided
        ai_title = title
        ai_description = description
        ai_tags = None
        
        if mcq_data:
            try:
                ai_request = AISummaryRequest(
                    category=category,
                    reporting_time=datetime.now().isoformat(),
                    latitude=final_latitude,
                    longitude=final_longitude,
                    mcq_responses=mcq_data,
                    reporter_name=current_user.full_name,
                    reporter_email=current_user.email
                )
                
                ai_summary = await ai_service.generate_summary(ai_request)
                ai_title = ai_summary.title
                ai_description = ai_summary.description
                ai_tags = json.dumps(ai_summary.tags) if ai_summary.tags else None
                
                logger.info(f"AI summary generated: {ai_title}")
                
            except Exception as e:
                logger.warning(f"AI summary generation failed: {str(e)}")
        else:
            # Generate basic report even without MCQs
            try:
                ai_request = AISummaryRequest(
                    category=category,
                    reporting_time=datetime.now().isoformat(),
                    latitude=final_latitude,
                    longitude=final_longitude,
                    mcq_responses={"duration": "Unknown", "severity": "Medium", "affectedArea": "Local area"},
                    reporter_name=current_user.full_name,
                    reporter_email=current_user.email
                )
                
                ai_summary = await ai_service.generate_summary(ai_request)
                ai_title = ai_summary.title
                ai_description = ai_summary.description
                ai_tags = json.dumps(ai_summary.tags) if ai_summary.tags else None
                
                logger.info(f"Basic AI summary generated: {ai_title}")
                
            except Exception as e:
                logger.warning(f"Basic AI summary generation failed: {str(e)}")
        
        # Create report in database
        report_data = ReportCreate(
            title=ai_title,
            description=ai_description,
            category=category,
            image_url=image_url,
            latitude=final_latitude,
            longitude=final_longitude,
            mcq_responses=mcq_data
        )
        
        report = await create_report(
            db,
            report_data,
            ai_title,
            ai_description,
            ai_tags,
            mcq_data,
            reporter_id=current_user.id
        )
        
        # Classify urgency using AI
        urgency_score = 50
        urgency_label = "Medium"
        
        try:
            # Get current user information for enhanced analysis
            reporter_name = current_user.full_name if current_user else None
            reporter_email = current_user.email if current_user else None
            
            classification_request = AIClassificationRequest(
                title=ai_title,
                description=ai_description or "",
                category=category,
                mcq_responses=mcq_data,
                latitude=final_latitude,
                longitude=final_longitude,
                reporter_name=reporter_name,
                reporter_email=reporter_email,
                reporting_time=datetime.now().isoformat(),
                image_description=ai_title  # Use AI-generated title as image description
            )
            
            classification = await ai_service.classify_urgency(classification_request)
            urgency_score = classification.urgency_score
            urgency_label = classification.urgency_label
            
            # Update report with urgency classification
            report.urgency_score = urgency_score
            report.urgency_label = urgency_label
            db.commit()
            
            logger.info(f"AI urgency classification: {urgency_label} ({urgency_score})")
            
        except Exception as e:
            logger.warning(f"AI urgency classification failed: {str(e)}")
        
        # Gamification: emit points and badge unlocks after successful creation
        try:
            # snapshot before
            prev = get_gamification_profile(db, current_user)
            # naive points update (report created)
            await websocket_manager.broadcast_gamification_event(current_user.id, {"type": "points_update", "delta": 50, "total": prev["user"]["points"] + 50})
            # recompute and detect badge unlocks
            newly = maybe_emit_badge_unlocks(db, current_user, prev)
            for n in newly:
                await websocket_manager.broadcast_gamification_event(current_user.id, {"type": "badge_unlocked", "badge": n["label"], "points_added": 0})
            # streak update
            await websocket_manager.broadcast_gamification_event(current_user.id, {"type": "streak_update", "streak_days": prev["user"].get("streak_days", 0) + 1})
        except Exception:
            pass

        return {
            "duplicate": False,
            "message": "Report created successfully.",
            "data": {
                "id": report.id,
                "title": report.title,
                "status": report.status,
                "latitude": report.latitude,
                "longitude": report.longitude
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating report: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while creating report"
        )

@app.get("/admin/reports")
async def get_admin_reports(
    urgency_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    db = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Get all reports for admin dashboard with urgency ranking
    """
    try:
        from models import Report
        from sqlalchemy import desc
        
        query = db.query(Report)
        
        # Apply filters
        if urgency_filter:
            query = query.filter(Report.urgency_label == urgency_filter)
        
        if status_filter:
            query = query.filter(Report.status == status_filter)
        
        # Sort by urgency score (highest first)
        reports = query.order_by(desc(Report.urgency_score)).all()
        
        return [
            {
                "id": report.id,
                "title": report.title,
                "category": report.category,
                "description": report.description,
                "latitude": report.latitude,
                "longitude": report.longitude,
                "urgency_score": report.urgency_score,
                "urgency_label": report.urgency_label,
                "status": report.status,
                "created_at": report.created_at.isoformat() if report.created_at else None,
                "image_url": report.image_url,
                "ai_generated_title": report.ai_generated_title,
                "ai_generated_description": report.ai_generated_description,
                "mcq_responses": report.mcq_responses,
                "is_deleted": bool(report.is_deleted),
                "deletion_reason": report.deletion_reason,
                "deleted_at": report.deleted_at.isoformat() if report.deleted_at else None,
                "reporter_id": report.reporter_id
            }
            for report in reports
        ]
        
    except Exception as e:
        logger.error(f"Error fetching admin reports: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching reports"
        )

@app.get("/reports", response_model=List[ReportResponse])
async def get_reports(
    skip: int = 0,
    limit: int = 100,
    db = Depends(get_db)
):
    """Get all reports with pagination."""
    try:
        from services.report_service import get_reports
        reports = await get_reports(db, skip=skip, limit=limit)
        return reports
    except Exception as e:
        logger.error(f"Error fetching reports: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching reports"
        )

# Community Endpoints (placed before /reports/{report_id} to avoid path conflicts)
@app.get("/reports/community", response_model=List[CommunityReport])
async def get_community_reports(
    skip: int = 0,
    limit: int = 50,
    sort: Optional[str] = "upvotes",
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch reports in user's municipality/local area with upvotes and comments count."""
    try:
        # For now, approximate by municipality_name on reporter user, else return all
        # Fetch base reports (non-deleted)
        base_query = db.query(Report).filter(Report.is_deleted == False)

        reports = base_query.all()

        # Preload counts to minimize queries
        report_ids = [r.id for r in reports]
        upvote_counts = {rid: 0 for rid in report_ids}
        comment_counts = {rid: 0 for rid in report_ids}

        if report_ids:
            from sqlalchemy import func
            upvote_rows = db.query(ReportUpvote.report_id, func.count(ReportUpvote.id)).filter(ReportUpvote.report_id.in_(report_ids)).group_by(ReportUpvote.report_id).all()
            for rid, cnt in upvote_rows:
                upvote_counts[rid] = cnt

            comment_rows = db.query(ReportComment.report_id, func.count(ReportComment.id)).filter(ReportComment.report_id.in_(report_ids)).group_by(ReportComment.report_id).all()
            for rid, cnt in comment_rows:
                comment_counts[rid] = cnt

        # Sort
        def sort_key(r: Report):
            if sort == "latest":
                return (r.created_at or datetime.min, upvote_counts.get(r.id, 0))
            elif sort == "urgency":
                return (r.urgency_score or 0, upvote_counts.get(r.id, 0))
            else:  # upvotes default
                return (upvote_counts.get(r.id, 0), r.created_at or datetime.min)

        reports_sorted = sorted(reports, key=sort_key, reverse=True)
        reports_paginated = reports_sorted[skip: skip + limit]

        # Build response with reporter names and whether current user has upvoted
        user_upvoted = set()
        if report_ids:
            rows = db.query(ReportUpvote.report_id).filter(
                ReportUpvote.report_id.in_(report_ids),
                ReportUpvote.user_id == current_user.id
            ).all()
            user_upvoted = {r[0] for r in rows}

        user_map = {}
        result: List[CommunityReport] = []
        for r in reports_paginated:
            reporter_name = None
            if r.reporter_id:
                if r.reporter_id not in user_map:
                    user_obj = db.query(User).filter(User.id == r.reporter_id).first()
                    user_map[r.reporter_id] = user_obj.full_name if user_obj else None
                reporter_name = user_map.get(r.reporter_id)
            result.append(CommunityReport(
                id=r.id,
                title=r.title,
                category=r.category,
                reporter_name=reporter_name,
                status=r.status,
                upvotes=upvote_counts.get(r.id, 0),
                comments_count=comment_counts.get(r.id, 0),
                urgency_score=r.urgency_score or 0,
                created_at=r.created_at,
                ai_generated_title=r.ai_generated_title,
                ai_generated_description=r.ai_generated_description,
                image_url=r.image_url,
                user_has_upvoted=(r.id in user_upvoted)
            ))

        return result
    except Exception as e:
        logger.error(f"Error fetching community reports: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/reports/{report_id}/upvote", response_model=UpvoteResponse)
async def toggle_upvote(
    report_id: int,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle upvote for a report by the current user."""
    try:
        report = db.query(Report).filter(Report.id == report_id, Report.is_deleted == False).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        existing = db.query(ReportUpvote).filter(
            ReportUpvote.report_id == report_id,
            ReportUpvote.user_id == current_user.id
        ).first()

        action = "added"
        if existing:
            db.delete(existing)
            action = "removed"
        else:
            db.add(ReportUpvote(report_id=report_id, user_id=current_user.id))

        db.commit()

        from sqlalchemy import func
        total_upvotes = db.query(func.count(ReportUpvote.id)).filter(ReportUpvote.report_id == report_id).scalar() or 0

        # Adjust urgency by +/- 0.5 per toggle
        try:
            report.urgency_score = float(report.urgency_score or 0)
            if action == "added":
                report.urgency_score = report.urgency_score + 0.5
            else:
                report.urgency_score = max(0.0, report.urgency_score - 0.5)
            db.commit()
        except Exception:
            db.rollback()

        # Broadcast via websocket
        try:
            await websocket_manager.broadcast_upvote_update(report_id, total_upvotes, current_user.id, action)
        except Exception:
            pass

        # Gamification: upvote given adds small points
        try:
            prev = get_gamification_profile(db, current_user)
            delta = 2 if action == "added" else -2
            await websocket_manager.broadcast_gamification_event(current_user.id, {"type": "points_update", "delta": delta, "total": prev["user"]["points"] + max(0, delta)})
        except Exception:
            pass

        return UpvoteResponse(
            message="Upvote removed successfully" if action == "removed" else "Upvote added successfully",
            total_upvotes=total_upvotes,
            user_has_upvoted=(action == "added")
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling upvote: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/reports/{report_id}/comments", response_model=List[CommentResponse])
async def get_report_comments(
    report_id: int,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all comments for a report (public to authenticated users)."""
    try:
        report = db.query(Report).filter(Report.id == report_id, Report.is_deleted == False).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        comments = db.query(ReportComment).filter(ReportComment.report_id == report_id).order_by(ReportComment.created_at.desc()).all()

        # Attach user_name
        user_names = {}
        responses: List[CommentResponse] = []
        for c in comments:
            if c.user_id not in user_names:
                u = db.query(User).filter(User.id == c.user_id).first()
                user_names[c.user_id] = u.full_name if u else None
            responses.append(CommentResponse(
                id=c.id,
                report_id=c.report_id,
                user_id=c.user_id,
                user_name=user_names.get(c.user_id),
                comment=c.comment,
                created_at=c.created_at
            ))
        return responses
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching comments: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/reports/{report_id}/comments", response_model=CommentResponse)
async def add_report_comment(
    report_id: int,
    data: CommentCreate,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new comment to a report."""
    try:
        report = db.query(Report).filter(Report.id == report_id, Report.is_deleted == False).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        comment = ReportComment(report_id=report_id, user_id=current_user.id, comment=data.comment)
        db.add(comment)
        db.commit()
        db.refresh(comment)

        # Broadcast via websocket
        try:
            await websocket_manager.broadcast_comment_new(
                report_id=report_id,
                comment_id=comment.id,
                user_id=current_user.id,
                comment=comment.comment,
                created_at=comment.created_at.isoformat(),
                user_name=current_user.full_name
            )
        except Exception:
            pass

        # Gamification: comment adds small points
        try:
            prev = get_gamification_profile(db, current_user)
            await websocket_manager.broadcast_gamification_event(current_user.id, {"type": "points_update", "delta": 3, "total": prev["user"]["points"] + 3})
        except Exception:
            pass

        return CommentResponse(
            id=comment.id,
            report_id=comment.report_id,
            user_id=comment.user_id,
            user_name=current_user.full_name,
            comment=comment.comment,
            created_at=comment.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding comment: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
@app.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db = Depends(get_db)
):
    """Get a specific report by ID."""
    try:
        from services.report_service import get_report_by_id
        report = await get_report_by_id(db, report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return ReportResponse(
            id=report.id,
            title=report.title,
            description=report.description,
            category=report.category,
            image_url=report.image_url,
            latitude=report.latitude,
            longitude=report.longitude,
            ai_generated_title=report.ai_generated_title,
            ai_generated_description=report.ai_generated_description,
            ai_tags=report.ai_tags,
            urgency_score=report.urgency_score,
            urgency_label=report.urgency_label,
            mcq_responses=report.mcq_responses,
            reporter_id=report.reporter_id,
            status=report.status,
            admin_notes=report.admin_notes,
            created_at=report.created_at,
            updated_at=report.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching report"
        )

# Department-based admin endpoints
@app.get("/admin/departments/initialize")
async def initialize_departments(
    db = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Initialize default departments and category mappings"""
    try:
        success = await department_service.initialize_departments(db)
        if success:
            return {"message": "Departments initialized successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to initialize departments")
    except Exception as e:
        logger.error(f"Error initializing departments: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/admin/departments")
async def get_all_departments(
    db = Depends(get_db)
):
    """Get all available departments"""
    try:
        from models import DepartmentCategory
        departments = db.query(DepartmentCategory).filter(DepartmentCategory.is_active == True).all()
        
        return [
            {
                "id": dept.id,
                "name": dept.name,
                "description": dept.description
            }
            for dept in departments
        ]
    except Exception as e:
        logger.error(f"Error fetching departments: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching departments"
        )

@app.get("/admin/departments/my-issues")
async def get_my_department_issues(
    urgency_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    db = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Get issues for admin's assigned department"""
    try:
        if not current_admin.department_name:
            raise HTTPException(
                status_code=400, 
                detail="Admin not assigned to any department"
            )
        
        reports = await department_service.get_reports_by_department(
            db, current_admin.department_name, status_filter, urgency_filter
        )
        
        # Get reporter information for each report
        result = []
        for report in reports:
            # Get reporter info
            reporter = db.query(User).filter(User.id == report.reporter_id).first()
            reporter_name = reporter.full_name if reporter else "Unknown"
            
            result.append({
                "id": report.id,
                "title": report.title,
                "category": report.category,
                "description": report.description,
                "latitude": report.latitude,
                "longitude": report.longitude,
                "urgency_score": report.urgency_score,
                "urgency_label": report.urgency_label,
                "status": report.status,
                "created_at": report.created_at.isoformat(),
                "image_url": report.image_url,
                "ai_generated_title": report.ai_generated_title,
                "ai_generated_description": report.ai_generated_description,
                "mcq_responses": report.mcq_responses,
                "reporter_name": reporter_name
            })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching department issues: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching department issues"
        )

@app.get("/admin/departments/other-issues")
async def get_other_department_issues(
    urgency_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    db = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Get issues from other departments"""
    try:
        if not current_admin.department_name:
            raise HTTPException(
                status_code=400, 
                detail="Admin not assigned to any department"
            )
        
        reports = await department_service.get_other_department_reports(
            db, current_admin.department_name, status_filter, urgency_filter
        )
        
        # Get reporter information for each report
        result = []
        for report in reports:
            # Get reporter info
            reporter = db.query(User).filter(User.id == report.reporter_id).first()
            reporter_name = reporter.full_name if reporter else "Unknown"
            
            result.append({
                "id": report.id,
                "title": report.title,
                "category": report.category,
                "description": report.description,
                "latitude": report.latitude,
                "longitude": report.longitude,
                "urgency_score": report.urgency_score,
                "urgency_label": report.urgency_label,
                "status": report.status,
                "created_at": report.created_at.isoformat(),
                "image_url": report.image_url,
                "ai_generated_title": report.ai_generated_title,
                "ai_generated_description": report.ai_generated_description,
                "mcq_responses": report.mcq_responses,
                "reporter_name": reporter_name
            })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching other department issues: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching other department issues"
        )

@app.get("/admin/departments/stats")
async def get_department_stats(
    db = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Get statistics for admin's department"""
    try:
        if not current_admin.department_name:
            raise HTTPException(
                status_code=400, 
                detail="Admin not assigned to any department"
            )
        
        stats = await department_service.get_department_stats(
            db, current_admin.department_name
        )
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching department stats: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching department stats"
        )

# Status tracking endpoints
@app.patch("/admin/reports/{report_id}/status")
async def update_report_status(
    report_id: int,
    status_data: StatusUpdateRequest,
    db = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Update report status with tracking and real-time broadcast"""
    try:
        result = await status_service.update_report_status(
            db, report_id, status_data.status, current_admin.id, status_data.notes
        )
        
        # Broadcast status update via WebSocket
        if result.get("success"):
            await websocket_manager.broadcast_status_update(
                report_id=report_id,
                old_status=result.get("old_status", ""),
                new_status=result.get("new_status", ""),
                changed_by=current_admin.full_name or current_admin.email,
                timestamp=result.get("changed_at", ""),
                notes=result.get("notes", "")
            )
        
        return result
    except Exception as e:
        logger.error(f"Error updating report status: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while updating status"
        )

@app.get("/reports/{report_id}/status-history", response_model=List[StatusHistoryResponse])
async def get_report_status_history(
    report_id: int,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get status history for a report"""
    try:
        # Verify user has access to this report
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Check if user is the reporter or an admin
        if report.reporter_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Access denied")
        
        history = await status_service.get_status_history(db, report_id)
        return [StatusHistoryResponse(**entry) for entry in history]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting status history: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while getting status history"
        )

@app.get("/reports/{report_id}/status-timeline")
async def get_report_status_timeline(
    report_id: int,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get complete status timeline for a report"""
    try:
        # Verify user has access to this report
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Check if user is the reporter or an admin
        if report.reporter_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Access denied")
        
        timeline = await status_service.get_report_status_timeline(db, report_id)
        return timeline
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting status timeline: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while getting status timeline"
        )

# Enhanced report resolution endpoint
@app.post("/admin/reports/{report_id}/resolve", response_model=ReportResolutionResponse)
async def resolve_report(
    report_id: int,
    resolution_image: UploadFile = File(...),
    admin_verification_image: Optional[UploadFile] = File(None),
    admin_notes: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Resolve a report with coordinate verification"""
    try:
        # Validate file type
        if not resolution_image.content_type or not resolution_image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="Resolution image must be an image (JPEG/PNG)"
            )
        
        # Validate admin verification image if provided
        if admin_verification_image and (not admin_verification_image.content_type or not admin_verification_image.content_type.startswith('image/')):
            raise HTTPException(
                status_code=400,
                detail="Admin verification image must be an image (JPEG/PNG)"
            )
        
        # Validate file size (10MB limit)
        content = await resolution_image.read()
        file_size = len(content)
        
        if file_size > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(
                status_code=400,
                detail="Resolution image size must be less than 10MB"
            )
        
        # Validate admin verification image size if provided
        if admin_verification_image:
            admin_content = await admin_verification_image.read()
            admin_file_size = len(admin_content)
            
            if admin_file_size > 10 * 1024 * 1024:  # 10MB
                raise HTTPException(
                    status_code=400,
                    detail="Admin verification image size must be less than 10MB"
                )
            
            # Reset admin verification image pointer
            await admin_verification_image.seek(0)
        
        # Reset resolution image pointer
        await resolution_image.seek(0)
        
        # Resolve the report
        result = await resolution_service.resolve_report(
            db, report_id, current_admin, resolution_image,
            admin_notes, latitude, longitude, admin_verification_image
        )
        
        # Parse resolution coordinates for response
        resolution_coords = {}
        if result.get("resolution_coordinates"):
            try:
                resolution_coords = json.loads(result["resolution_coordinates"])
            except json.JSONDecodeError:
                resolution_coords = {}
        
        # Broadcast resolution update via WebSocket
        if result.get("success"):
            await websocket_manager.broadcast_resolution_update(
                report_id=report_id,
                evidence_url=result.get("resolution_image_url", ""),
                admin_coordinates={
                    "lat": resolution_coords.get("latitude", 0),
                    "lng": resolution_coords.get("longitude", 0)
                },
                distance_meters=result.get("distance_meters", 0)
            )
            # Also broadcast a status update for clients tracking status changes
            try:
                await websocket_manager.broadcast_status_update(
                    report_id=report_id,
                    old_status=result.get("status_update", {}).get("old_status", "in_progress"),
                    new_status="resolved",
                    changed_by=current_admin.full_name or current_admin.email,
                    timestamp=datetime.utcnow().isoformat(),
                    notes=result.get("status_update", {}).get("notes", "Resolved with geo-verified evidence")
                )
            except Exception:
                pass
        
        # Gamification: resolved by admin shouldn't change citizen points directly
        try:
            # Optionally: reward reporter if resolution is within SLA
            # Here we skip as reporter_id might differ from admin
            pass
        except Exception:
            pass

        return ReportResolutionResponse(
            success=result["success"],
            message=result["message"],
            report_id=result["report_id"],
            status="resolved",
            resolved_at=datetime.utcnow(),
            evidence_url=result.get("resolution_image_url", ""),
            admin_coordinates={
                "lat": resolution_coords.get("latitude", 0),
                "lng": resolution_coords.get("longitude", 0)
            },
            distance_verified=result.get("distance_verified", False),
            distance_meters=result.get("distance_meters", 0),
            admin_id=result.get("admin_id", ""),
            admin_verification_image_url=result.get("admin_verification_image_url")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving report {report_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while resolving report"
        )



# Instant face verification endpoint for photo capture
@app.post("/verify-face-instant", response_model=FaceVerifyResponse)
async def verify_face_instant(
    data: InstantFaceVerifyRequest,
    current_user: User = Depends(get_current_user)
):
    """Instant face verification for photo capture - no report ID required"""
    try:
        # Verify face
        result = await face_verification_service.verify_face(data.image_base64)
        
        # More lenient verification - accept if either method succeeds
        if not result.face_detected_locally and not result.openai_confirms_human:
            return FaceVerifyResponse(
                success=False, 
                face_detected=result.face_detected_locally, 
                openai_human=result.openai_confirms_human
            )
        
        return FaceVerifyResponse(
            success=True,
            face_detected=result.face_detected_locally,
            openai_human=result.openai_confirms_human
        )
        
    except Exception as e:
        logger.error(f"Instant face verification error: {e}")
        raise HTTPException(status_code=500, detail="Face verification failed")

# Face verification endpoint
@app.post("/resolve/{report_id}/verify-face", response_model=FaceVerifyResponse)
async def verify_face_endpoint(
    report_id: int,
    data: FaceVerifyRequest,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verify live human face before allowing report resolution.

    Accepts base64 image from webcam, runs local OpenCV detection and OpenAI confirmation.
    Persists verification proof if successful.
    """
    try:
        # Validate IDs
        if data.report_id != report_id:
            raise HTTPException(status_code=400, detail="Path and body report_id mismatch")

        # Determine who is verifying
        who_id = None
        if current_user.role == "admin":
            who_id = current_user.id
        else:
            who_id = current_user.id

        # Run verification
        result = await face_verification_service.verify_face(data.image_base64)
        
        # More lenient verification - accept if either method succeeds
        if not result.face_detected_locally and not result.openai_confirms_human:
            return FaceVerifyResponse(
                success=False, 
                face_detected=result.face_detected_locally, 
                openai_human=result.openai_confirms_human
            )

        # Store verification image
        import base64 as _b64
        raw = _b64.b64decode(data.image_base64.split(",", 1)[1] if "," in data.image_base64 else data.image_base64)
        image_url = await storage_service.upload_face_verification_image(image_bytes=raw, report_id=report_id, who_id=who_id)

        # Persist record
        fv = FaceVerification(
            report_id=report_id,
            admin_id=who_id if current_user.role == "admin" else None,
            citizen_id=who_id if current_user.role == "citizen" else None,
            image_url=image_url,
            face_verified=True,
        )
        db.add(fv)
        db.commit()
        db.refresh(fv)

        return FaceVerifyResponse(
            success=True,
            face_detected=True,
            openai_human=True,
            image_url=image_url,
            verified_at=fv.verified_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face verification error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during face verification")


@app.get("/admin/reports/{report_id}/resolution")
async def get_report_resolution(
    report_id: int,
    db = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Get resolution details for a report"""
    try:
        resolution_details = await resolution_service.get_resolution_details(db, report_id)
        if not resolution_details:
            raise HTTPException(status_code=404, detail="Resolution details not found")
        
        return resolution_details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting resolution details for report {report_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while getting resolution details"
        )

# Public (reporter or admin) resolution details endpoint
@app.get("/reports/{report_id}/resolution")
async def get_public_report_resolution(
    report_id: int,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get resolution details for a report for the reporter or any admin"""
    try:
        # Verify access
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        if report.reporter_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Access denied")

        resolution_details = await resolution_service.get_resolution_details(db, report_id)
        if not resolution_details:
            raise HTTPException(status_code=404, detail="Resolution details not found")

        return resolution_details
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting public resolution details for report {report_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while getting resolution details"
        )

# Citizen Report Management Endpoints

@app.get("/citizen/reports", response_model=List[ReportResponse])
async def get_citizen_reports(
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all non-deleted reports submitted by the current citizen"""
    try:
        reports = db.query(Report).filter(
            Report.reporter_id == current_user.id,
            Report.is_deleted == False
        ).order_by(Report.created_at.desc()).all()
        
        # Preload ratings to avoid N+1 queries
        report_ids = [r.id for r in reports]
        ratings_map = {}
        if report_ids:
            rows = db.query(ReportRating).filter(ReportRating.report_id.in_(report_ids)).all()
            for rr in rows:
                ratings_map[rr.report_id] = rr

        # Convert reports to response format with proper timezone handling
        response_reports = []
        for report in reports:
            rr = ratings_map.get(report.id)
            report_dict = {
                "id": report.id,
                "title": report.title,
                "description": report.description,
                "category": report.category,
                "image_url": report.image_url,
                "latitude": report.latitude,
                "longitude": report.longitude,
                "ai_generated_title": report.ai_generated_title,
                "ai_generated_description": report.ai_generated_description,
                "ai_tags": report.ai_tags,
                "urgency_score": report.urgency_score,
                "urgency_label": report.urgency_label,
                "mcq_responses": report.mcq_responses,
                "reporter_id": report.reporter_id,
                "status": report.status,
                "admin_notes": report.admin_notes,
                "rating": rr.rating if rr else None,
                "rating_feedback": rr.feedback if rr else None,
                "resolved_by": report.resolved_by,
                "resolved_at": to_iso_utc(report.resolved_at),
                "resolution_image_url": report.resolution_image_url,
                "resolution_coordinates": report.resolution_coordinates,
                "is_deleted": report.is_deleted,
                "deletion_reason": report.deletion_reason,
                "deleted_at": to_iso_utc(report.deleted_at),
                "created_at": to_iso_utc(report.created_at),
                "updated_at": to_iso_utc(report.updated_at)
            }
            response_reports.append(report_dict)
        
        return response_reports
        
    except Exception as e:
        logger.error(f"Error getting citizen reports: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while getting reports"
        )

@app.post("/citizen/replies", response_model=CitizenReplyResponse)
async def create_citizen_reply(
    reply_data: CitizenReplyCreate,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new reply to a report"""
    try:
        # Verify the report exists and belongs to the user
        report = db.query(Report).filter(
            Report.id == reply_data.report_id,
            Report.reporter_id == current_user.id
        ).first()
        
        if not report:
            raise HTTPException(
                status_code=404,
                detail="Report not found or access denied"
            )
        
        # Create the reply
        reply = CitizenReply(
            report_id=reply_data.report_id,
            message=reply_data.message,
            is_admin_reply=reply_data.is_admin_reply
        )
        
        db.add(reply)
        db.commit()
        db.refresh(reply)
        
        return CitizenReplyResponse.model_validate(reply)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating citizen reply: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while creating reply"
        )

@app.get("/reports/{report_id}/replies", response_model=List[CitizenReplyResponse])
async def get_report_replies(
    report_id: int,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all replies for a specific report"""
    try:
        # Verify the report exists and belongs to the user
        report = db.query(Report).filter(
            Report.id == report_id,
            Report.reporter_id == current_user.id
        ).first()
        
        if not report:
            raise HTTPException(
                status_code=404,
                detail="Report not found or access denied"
            )
        
        replies = db.query(CitizenReply).filter(
            CitizenReply.report_id == report_id
        ).order_by(CitizenReply.created_at.asc()).all()
        
        return [CitizenReplyResponse.model_validate(reply) for reply in replies]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting report replies: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while getting replies"
        )

@app.post("/citizen/ratings", response_model=ReportRatingResponse)
async def create_report_rating(
    rating_data: ReportRatingCreate,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rate a resolved report"""
    try:
        # Verify the report exists, belongs to the user, and is resolved
        report = db.query(Report).filter(
            Report.id == rating_data.report_id,
            Report.reporter_id == current_user.id,
            Report.status == "resolved"
        ).first()
        
        if not report:
            raise HTTPException(
                status_code=404,
                detail="Resolved report not found or access denied"
            )
        
        # Check if rating already exists
        existing_rating = db.query(ReportRating).filter(
            ReportRating.report_id == rating_data.report_id
        ).first()
        
        if existing_rating:
            raise HTTPException(
                status_code=400,
                detail="Report has already been rated"
            )
        
        # Create the rating
        rating = ReportRating(
            report_id=rating_data.report_id,
            rating=rating_data.rating,
            feedback=rating_data.feedback
        )
        
        db.add(rating)
        db.commit()
        db.refresh(rating)
        
        return ReportRatingResponse.model_validate(rating)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating report rating: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while creating rating"
        )

@app.delete("/citizen/reports/{report_id}")
async def delete_citizen_report(
    report_id: int,
    deletion_data: ReportDeletionRequest,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a citizen's report as deleted with reason"""
    try:
        # Verify the report exists and belongs to the user
        report = db.query(Report).filter(
            Report.id == report_id,
            Report.reporter_id == current_user.id
        ).first()
        
        if not report:
            raise HTTPException(
                status_code=404,
                detail="Report not found or access denied"
            )
        
        if report.is_deleted:
            raise HTTPException(
                status_code=400,
                detail="Report has already been deleted"
            )
        
        # Mark report as deleted instead of actually deleting
        report.is_deleted = True
        report.deletion_reason = deletion_data.reason
        report.deleted_at = datetime.utcnow()
        report.status = "deleted"
        
        db.commit()
        
        return {"message": "Report deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting citizen report: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while deleting report"
        )

# Admin Review Endpoints

@app.get("/admin/reviews")
async def get_citizen_reviews(
    db = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Get all citizen reviews and ratings for admin dashboard"""
    try:
        # Get all ratings with report and user information
        ratings = db.query(ReportRating, Report, User).join(
            Report, ReportRating.report_id == Report.id
        ).join(
            User, Report.reporter_id == User.id
        ).order_by(ReportRating.created_at.desc()).all()
        
        reviews = []
        for rating, report, user in ratings:
            reviews.append({
                "id": rating.id,
                "report_id": rating.report_id,
                "report_title": report.title,
                "category": report.category,
                "citizen_name": user.full_name,
                "rating": rating.rating,
                "feedback": rating.feedback,
                "created_at": rating.created_at,
                "resolved_at": report.resolved_at,
                "resolved_by": report.resolved_by,
                "department": current_admin.department_name or "General"
            })
        
        return reviews
        
    except Exception as e:
        logger.error(f"Error getting citizen reviews: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while getting reviews"
        )

@app.get("/admin/reviews/stats")
async def get_review_stats(
    db = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Get review statistics for admin dashboard"""
    try:
        # Get all ratings
        ratings = db.query(ReportRating).all()
        
        if not ratings:
            return {
                "total_reviews": 0,
                "average_rating": 0,
                "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
                "category_ratings": {},
                "department_performance": {},
                "recent_trend": "stable"
            }
        
        # Calculate statistics
        total_reviews = len(ratings)
        average_rating = sum(r.rating for r in ratings) / total_reviews
        
        rating_distribution = {i: 0 for i in range(1, 6)}
        for rating in ratings:
            rating_distribution[rating.rating] += 1
        
        # Get category ratings
        category_ratings = {}
        for rating in ratings:
            report = db.query(Report).filter(Report.id == rating.report_id).first()
            if report:
                if report.category not in category_ratings:
                    category_ratings[report.category] = []
                category_ratings[report.category].append(rating.rating)
        
        # Calculate average for each category
        for category in category_ratings:
            category_ratings[category] = sum(category_ratings[category]) / len(category_ratings[category])
        
        return {
            "total_reviews": total_reviews,
            "average_rating": round(average_rating, 1),
            "rating_distribution": rating_distribution,
            "category_ratings": category_ratings,
            "department_performance": {
                current_admin.department_name or "General": round(average_rating, 1)
            },
            "recent_trend": "up"  # This could be calculated based on recent vs older ratings
        }
        
    except Exception as e:
        logger.error(f"Error getting review stats: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while getting review stats"
        )

# Community Endpoints
@app.get("/reports/community", response_model=List[CommunityReport])
async def get_community_reports(
    skip: int = 0,
    limit: int = 50,
    sort: Optional[str] = "upvotes",
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch reports in user's municipality/local area with upvotes and comments count."""
    try:
        # For now, approximate by municipality_name on reporter user, else return all
        # Fetch base reports (non-deleted)
        base_query = db.query(Report).filter(Report.is_deleted == False)

        reports = base_query.all()

        # Preload counts to minimize queries
        report_ids = [r.id for r in reports]
        upvote_counts = {rid: 0 for rid in report_ids}
        comment_counts = {rid: 0 for rid in report_ids}

        if report_ids:
            from sqlalchemy import func
            upvote_rows = db.query(ReportUpvote.report_id, func.count(ReportUpvote.id)).filter(ReportUpvote.report_id.in_(report_ids)).group_by(ReportUpvote.report_id).all()
            for rid, cnt in upvote_rows:
                upvote_counts[rid] = cnt

            comment_rows = db.query(ReportComment.report_id, func.count(ReportComment.id)).filter(ReportComment.report_id.in_(report_ids)).group_by(ReportComment.report_id).all()
            for rid, cnt in comment_rows:
                comment_counts[rid] = cnt

        # Sort
        def sort_key(r: Report):
            if sort == "latest":
                return (r.created_at or datetime.min, upvote_counts.get(r.id, 0))
            elif sort == "urgency":
                return (r.urgency_score or 0, upvote_counts.get(r.id, 0))
            else:  # upvotes default
                return (upvote_counts.get(r.id, 0), r.created_at or datetime.min)

        reports_sorted = sorted(reports, key=sort_key, reverse=True)
        reports_paginated = reports_sorted[skip: skip + limit]

        # Build response with reporter names and whether current user has upvoted
        user_upvoted = set()
        if report_ids:
            rows = db.query(ReportUpvote.report_id).filter(
                ReportUpvote.report_id.in_(report_ids),
                ReportUpvote.user_id == current_user.id
            ).all()
            user_upvoted = {r[0] for r in rows}

        # Build response with reporter names
        user_map = {}
        result: List[CommunityReport] = []
        for r in reports_paginated:
            reporter_name = None
            if r.reporter_id:
                if r.reporter_id not in user_map:
                    user_obj = db.query(User).filter(User.id == r.reporter_id).first()
                    user_map[r.reporter_id] = user_obj.full_name if user_obj else None
                reporter_name = user_map.get(r.reporter_id)
            result.append(CommunityReport(
                id=r.id,
                title=r.title,
                category=r.category,
                reporter_name=reporter_name,
                status=r.status,
                upvotes=upvote_counts.get(r.id, 0),
                comments_count=comment_counts.get(r.id, 0),
                urgency_score=r.urgency_score or 0,
                created_at=r.created_at,
                ai_generated_title=r.ai_generated_title,
                ai_generated_description=r.ai_generated_description,
                image_url=r.image_url,
                user_has_upvoted=(r.id in user_upvoted)
            ))

        return result
    except Exception as e:
        logger.error(f"Error fetching community reports: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/reports/{report_id}/upvote", response_model=UpvoteResponse)
async def toggle_upvote(
    report_id: int,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle upvote for a report by the current user."""
    try:
        report = db.query(Report).filter(Report.id == report_id, Report.is_deleted == False).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        existing = db.query(ReportUpvote).filter(
            ReportUpvote.report_id == report_id,
            ReportUpvote.user_id == current_user.id
        ).first()

        action = "added"
        if existing:
            db.delete(existing)
            action = "removed"
        else:
            db.add(ReportUpvote(report_id=report_id, user_id=current_user.id))

        db.commit()

        from sqlalchemy import func
        total_upvotes = db.query(func.count(ReportUpvote.id)).filter(ReportUpvote.report_id == report_id).scalar() or 0

        # Broadcast via websocket
        try:
            await websocket_manager.broadcast_upvote_update(report_id, total_upvotes, current_user.id, action)
        except Exception:
            pass

        return UpvoteResponse(
            message="Upvote removed successfully" if action == "removed" else "Upvote added successfully",
            total_upvotes=total_upvotes,
            user_has_upvoted=(action == "added")
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling upvote: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/reports/{report_id}/comments", response_model=List[CommentResponse])
async def get_report_comments(
    report_id: int,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all comments for a report (public to authenticated users)."""
    try:
        report = db.query(Report).filter(Report.id == report_id, Report.is_deleted == False).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        comments = db.query(ReportComment).filter(ReportComment.report_id == report_id).order_by(ReportComment.created_at.desc()).all()

        # Attach user_name
        user_names = {}
        responses: List[CommentResponse] = []
        for c in comments:
            if c.user_id not in user_names:
                u = db.query(User).filter(User.id == c.user_id).first()
                user_names[c.user_id] = u.full_name if u else None
            responses.append(CommentResponse(
                id=c.id,
                report_id=c.report_id,
                user_id=c.user_id,
                user_name=user_names.get(c.user_id),
                comment=c.comment,
                created_at=c.created_at
            ))
        return responses
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching comments: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/reports/{report_id}/comments", response_model=CommentResponse)
async def add_report_comment(
    report_id: int,
    data: CommentCreate,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new comment to a report."""
    try:
        report = db.query(Report).filter(Report.id == report_id, Report.is_deleted == False).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        comment = ReportComment(report_id=report_id, user_id=current_user.id, comment=data.comment)
        db.add(comment)
        db.commit()
        db.refresh(comment)

        # Broadcast via websocket
        try:
            await websocket_manager.broadcast_comment_new(
                report_id=report_id,
                comment_id=comment.id,
                user_id=current_user.id,
                comment=comment.comment,
                created_at=comment.created_at.isoformat(),
                user_name=current_user.full_name
            )
        except Exception:
            pass

        return CommentResponse(
            id=comment.id,
            report_id=comment.report_id,
            user_id=comment.user_id,
            user_name=current_user.full_name,
            comment=comment.comment,
            created_at=comment.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding comment: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )