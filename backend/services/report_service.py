from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import logging

from models import Report
from schemas import ReportCreate, ReportResponse

logger = logging.getLogger(__name__)

async def create_report(
    db: Session, 
    report_data: ReportCreate,
    ai_title: str = None,
    ai_description: str = None,
    ai_tags: str = None,
    mcq_responses: dict = None,
    reporter_id=None
) -> Report:
    """
    Create a new report in the database with AI-generated content.
    
    Args:
        db: Database session
        report_data: Report data to create
        ai_title: AI-generated title
        ai_description: AI-generated description
        ai_tags: AI-generated tags (JSON string)
        mcq_responses: MCQ responses (dict)
        reporter_id: ID of the reporter
    
    Returns:
        Created report object
    """
    try:
        import json
        import uuid
        
        # Convert MCQ responses to JSON string
        mcq_json = json.dumps(mcq_responses) if mcq_responses else None
        
        # Create report object
        db_report = Report(
            title=report_data.title,
            description=report_data.description,
            category=report_data.category,
            image_url=report_data.image_url,
            latitude=report_data.latitude,
            longitude=report_data.longitude,
            
            # AI-generated fields
            ai_generated_title=ai_title,
            ai_generated_description=ai_description,
            ai_tags=ai_tags,
            
            # MCQ responses
            mcq_responses=mcq_json,
            
            # Default values
            urgency_score=50,
            urgency_label="Medium",
            status="pending",
            reporter_id=reporter_id or str(uuid.uuid4())
        )
        
        # Add to database
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        
        logger.info(f"Report created successfully with ID: {db_report.id}")
        return db_report
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating report: {e}")
        raise

async def get_report_by_id(db: Session, report_id: int) -> Optional[Report]:
    """
    Get a report by its ID.
    
    Args:
        db: Database session
        report_id: ID of the report to retrieve
    
    Returns:
        Report object or None if not found
    """
    try:
        return db.query(Report).filter(Report.id == report_id).first()
    except Exception as e:
        logger.error(f"Error fetching report {report_id}: {e}")
        raise

async def get_reports(db: Session, skip: int = 0, limit: int = 100) -> List[Report]:
    """
    Get all reports with pagination.
    
    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of report objects
    """
    try:
        return db.query(Report).offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error fetching reports: {e}")
        raise

async def get_reports_by_location(
    db: Session, 
    latitude: float, 
    longitude: float, 
    radius_km: float = 5.0
) -> List[Report]:
    """
    Get reports within a specified radius of a location.
    
    Args:
        db: Database session
        latitude: Center latitude
        longitude: Center longitude
        radius_km: Search radius in kilometers
    
    Returns:
        List of nearby report objects
    """
    try:
        # Simple distance calculation (approximate)
        # In production, use proper geospatial queries
        reports = db.query(Report).all()
        
        # Filter by approximate distance
        nearby_reports = []
        for report in reports:
            # Simple distance calculation (not precise but works for demo)
            lat_diff = abs(report.latitude - latitude)
            lon_diff = abs(report.longitude - longitude)
            if lat_diff <= radius_km/111 and lon_diff <= radius_km/111:
                nearby_reports.append(report)
        
        return nearby_reports
        
    except Exception as e:
        logger.error(f"Error fetching reports by location: {e}")
        raise

async def get_reports_by_category(db: Session, category: str) -> List[Report]:
    """
    Get reports by category.
    
    Args:
        db: Database session
        category: Category to filter by
    
    Returns:
        List of report objects
    """
    try:
        return db.query(Report).filter(Report.category == category).all()
    except Exception as e:
        logger.error(f"Error fetching reports by category: {e}")
        raise

async def update_report(db: Session, report_id: int, update_data: dict) -> Optional[Report]:
    """
    Update a report.
    
    Args:
        db: Database session
        report_id: ID of the report to update
        update_data: Dictionary of fields to update
    
    Returns:
        Updated report object or None if not found
    """
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return None
        
        # Update fields
        for field, value in update_data.items():
            if hasattr(report, field):
                setattr(report, field, value)
        
        db.commit()
        db.refresh(report)
        
        logger.info(f"Report {report_id} updated successfully")
        return report
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating report {report_id}: {e}")
        raise

async def delete_report(db: Session, report_id: int) -> bool:
    """
    Delete a report.
    
    Args:
        db: Database session
        report_id: ID of the report to delete
    
    Returns:
        True if deletion successful, False if report not found
    """
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return False
        
        db.delete(report)
        db.commit()
        
        logger.info(f"Report {report_id} deleted successfully")
        return True
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting report {report_id}: {e}")
        raise
