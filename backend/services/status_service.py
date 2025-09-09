"""
Status Tracking Service for CrowdCare
Handles report status updates and history tracking
"""

import logging
import json
from sqlalchemy.orm import Session
from typing import Optional, Dict, List
from models import Report, ReportStatusHistory, User
from sqlalchemy import func
from datetime import datetime

logger = logging.getLogger(__name__)

class StatusService:
    def __init__(self):
        self.valid_statuses = ["reported", "acknowledged", "in_progress", "resolved"]
        
    async def update_report_status(self, db: Session, report_id: int, new_status: str, 
                                 changed_by: str, notes: Optional[str] = None) -> Dict:
        """
        Update report status and create history entry with proper lifecycle validation
        
        Args:
            db: Database session
            report_id: ID of the report to update
            new_status: New status to set
            changed_by: User ID who is changing the status
            notes: Optional notes about the status change
        
        Returns:
            Dictionary with update status and details
        """
        try:
            # Validate status
            if new_status not in self.valid_statuses:
                raise ValueError(f"Invalid status: {new_status}. Valid statuses: {self.valid_statuses}")
            
            # Get the report
            report = db.query(Report).filter(Report.id == report_id).first()
            if not report:
                raise ValueError(f"Report {report_id} not found")
            
            # Check if status is already set
            if report.status == new_status:
                return {
                    "success": True,
                    "message": f"Status is already {new_status}",
                    "report_id": report_id,
                    "status": new_status
                }
            
            # Lock resolved status permanently unless explicitly reopened
            if report.status == "resolved" and new_status != "resolved":
                raise ValueError("Report is resolved and cannot be changed. Use a dedicated reopen flow if needed.")

            # Validate status lifecycle - prevent skipping stages
            try:
                current_status_index = self.valid_statuses.index(report.status)
                new_status_index = self.valid_statuses.index(new_status)
                
                # Allow moving forward one step at a time, or backward
                if new_status_index > current_status_index + 1:
                    raise ValueError(f"Cannot skip status stages. Current: {report.status}, Attempted: {new_status}")
            except ValueError as e:
                # Handle cases where status might not be in the predefined order
                if "not in list" in str(e):
                    logger.warning(f"Status '{report.status}' or '{new_status}' not in valid statuses, allowing transition")
                else:
                    raise
            
            # Special validation for resolved status
            if new_status == "resolved" and report.status != "resolved":
                # This should only be called from the resolution endpoint with evidence
                raise ValueError("Resolution requires evidence upload. Use the resolve endpoint instead.")
            
            # Update report status
            old_status = report.status
            report.status = new_status
            
            # Update specific timestamp fields
            now = func.now()
            if new_status == "acknowledged":
                report.acknowledged_at = now
            elif new_status == "in_progress":
                report.in_progress_at = now
            elif new_status == "resolved":
                report.resolved_at = now
            
            # Create status history entry
            status_history = ReportStatusHistory(
                report_id=report_id,
                status=new_status,
                changed_by=changed_by,
                notes=notes
            )
            db.add(status_history)
            
            # Update status history JSON field
            try:
                self._update_status_history_json(db, report, new_status, changed_by, notes)
            except Exception as e:
                logger.warning(f"Failed to update status history JSON: {e}")
            
            # Commit changes
            db.commit()
            db.refresh(report)
            db.refresh(status_history)
            
            logger.info(f"Report {report_id} status updated from {old_status} to {new_status} by {changed_by}")
            
            return {
                "success": True,
                "message": f"Status updated from {old_status} to {new_status}",
                "report_id": report_id,
                "old_status": old_status,
                "new_status": new_status,
                "changed_by": changed_by,
                "changed_at": status_history.changed_at.isoformat(),
                "notes": notes
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating report status: {e}")
            raise
    
    async def resolve_report_with_evidence(self, db: Session, report_id: int, 
                                         changed_by: str, notes: Optional[str] = None) -> Dict:
        """
        Resolve a report with evidence (called from resolution service)
        
        Args:
            db: Database session
            report_id: ID of the report to resolve
            changed_by: User ID who is resolving the report
            notes: Optional notes about the resolution
        
        Returns:
            Dictionary with resolution status and details
        """
        try:
            # Get the report
            report = db.query(Report).filter(Report.id == report_id).first()
            if not report:
                raise ValueError(f"Report {report_id} not found")
            
            # Check if report is already resolved
            if report.status == "resolved":
                return {
                    "success": True,
                    "message": "Report is already resolved",
                    "report_id": report_id,
                    "status": "resolved"
                }
            
            # Update report status to resolved
            old_status = report.status
            report.status = "resolved"
            report.resolved_at = func.now()
            
            # Create status history entry
            status_history = ReportStatusHistory(
                report_id=report_id,
                status="resolved",
                changed_by=changed_by,
                notes=notes or "Report resolved with geo-verified evidence"
            )
            db.add(status_history)
            
            # Update status history JSON field
            self._update_status_history_json(db, report, "resolved", changed_by, notes)
            
            # Commit changes
            db.commit()
            db.refresh(report)
            db.refresh(status_history)
            
            logger.info(f"Report {report_id} resolved successfully by {changed_by}")
            
            return {
                "success": True,
                "message": f"Report resolved successfully",
                "report_id": report_id,
                "old_status": old_status,
                "new_status": "resolved",
                "changed_by": changed_by,
                "changed_at": status_history.changed_at.isoformat(),
                "notes": notes
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error resolving report: {e}")
            raise
    
    def _update_status_history_json(self, db: Session, report: Report, 
                                   new_status: str, changed_by: str, notes: Optional[str] = None):
        """Update the status_history JSON field in the report"""
        try:
            # Get existing history
            history = []
            if report.status_history:
                try:
                    history = json.loads(report.status_history)
                except json.JSONDecodeError:
                    history = []
            
            # Add new entry
            history.append({
                "status": new_status,
                "changed_by": changed_by,
                "changed_at": datetime.utcnow().isoformat(),
                "notes": notes
            })
            
            # Update the field
            report.status_history = json.dumps(history)
            
        except Exception as e:
            logger.error(f"Error updating status history JSON: {e}")
    
    async def get_status_history(self, db: Session, report_id: int) -> List[Dict]:
        """Get status history for a report"""
        try:
            history_entries = db.query(ReportStatusHistory).filter(
                ReportStatusHistory.report_id == report_id
            ).order_by(ReportStatusHistory.changed_at.asc()).all()
            
            return [
                {
                    "id": entry.id,
                    "status": entry.status,
                    "changed_by": entry.changed_by,
                    "changed_at": entry.changed_at.isoformat(),
                    "notes": entry.notes
                }
                for entry in history_entries
            ]
            
        except Exception as e:
            logger.error(f"Error getting status history for report {report_id}: {e}")
            return []
    
    async def get_report_status_timeline(self, db: Session, report_id: int) -> Dict:
        """Get complete status timeline for a report"""
        try:
            report = db.query(Report).filter(Report.id == report_id).first()
            if not report:
                return {}
            
            # Get status history
            history = await self.get_status_history(db, report_id)
            
            # Build timeline
            timeline = {
                "report_id": report_id,
                "current_status": report.status,
                "stages": {
                    "reported": {
                        "status": "completed",
                        "timestamp": report.reported_at.isoformat() if report.reported_at else None,
                        "notes": "Issue reported by citizen"
                    },
                    "acknowledged": {
                        "status": "completed" if report.acknowledged_at else "pending",
                        "timestamp": report.acknowledged_at.isoformat() if report.acknowledged_at else None,
                        "notes": "Issue acknowledged by admin"
                    },
                    "in_progress": {
                        "status": "completed" if report.in_progress_at else "pending",
                        "timestamp": report.in_progress_at.isoformat() if report.in_progress_at else None,
                        "notes": "Work started on issue"
                    },
                    "resolved": {
                        "status": "completed" if report.resolved_at else "pending",
                        "timestamp": report.resolved_at.isoformat() if report.resolved_at else None,
                        "notes": "Issue resolved with evidence"
                    }
                },
                "history": history
            }
            
            return timeline
            
        except Exception as e:
            logger.error(f"Error getting status timeline for report {report_id}: {e}")
            return {}

# Global status service instance
status_service = StatusService()
