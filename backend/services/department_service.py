"""
Department Management Service for CrowdCare
Handles department categories and category-department mappings
"""

import logging
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from models import DepartmentCategory, CategoryDepartmentMapping, Report, User
from sqlalchemy import func

logger = logging.getLogger(__name__)

class DepartmentService:
    def __init__(self):
        # Initialize default department categories and mappings
        self.default_departments = [
            {"name": "Garbage", "description": "Waste management and sanitation"},
            {"name": "Roads", "description": "Road infrastructure and maintenance"},
            {"name": "Water", "description": "Water supply and drainage"},
            {"name": "Electricity", "description": "Power infrastructure and street lighting"},
            {"name": "Traffic", "description": "Traffic signals and road safety"},
            {"name": "Parks", "description": "Public parks and recreation areas"},
            {"name": "General", "description": "General municipal services"}
        ]
        
        self.default_mappings = [
            # Garbage Department
            {"category": "Garbage", "department": "Garbage"},
            {"category": "Waste", "department": "Garbage"},
            {"category": "Sanitation", "department": "Garbage"},
            
            # Roads Department
            {"category": "Pothole", "department": "Roads"},
            {"category": "Road Damage", "department": "Roads"},
            {"category": "Sidewalk", "department": "Roads"},
            {"category": "Drainage", "department": "Roads"},
            
            # Water Department
            {"category": "Waterlogging", "department": "Water"},
            {"category": "Water Supply", "department": "Water"},
            
            # Electricity Department
            {"category": "Streetlight", "department": "Electricity"},
            {"category": "Power Outage", "department": "Electricity"},
            
            # Traffic Department
            {"category": "Traffic Signal", "department": "Traffic"},
            {"category": "Road Safety", "department": "Traffic"},
            
            # Parks Department
            {"category": "Park Maintenance", "department": "Parks"},
            {"category": "Recreation", "department": "Parks"},
            
            # General Department (catch-all)
            {"category": "Other", "department": "General"}
        ]
    
    async def initialize_departments(self, db: Session) -> bool:
        """Initialize default departments and category mappings"""
        try:
            # Create default departments
            for dept_data in self.default_departments:
                existing = db.query(DepartmentCategory).filter(
                    DepartmentCategory.name == dept_data["name"]
                ).first()
                
                if not existing:
                    dept = DepartmentCategory(
                        name=dept_data["name"],
                        description=dept_data["description"]
                    )
                    db.add(dept)
                    logger.info(f"Created department: {dept_data['name']}")
            
            # Create default category mappings
            for mapping_data in self.default_mappings:
                existing = db.query(CategoryDepartmentMapping).filter(
                    CategoryDepartmentMapping.category == mapping_data["category"],
                    CategoryDepartmentMapping.department_name == mapping_data["department"]
                ).first()
                
                if not existing:
                    mapping = CategoryDepartmentMapping(
                        category=mapping_data["category"],
                        department_name=mapping_data["department"]
                    )
                    db.add(mapping)
                    logger.info(f"Created mapping: {mapping_data['category']} -> {mapping_data['department']}")
            
            db.commit()
            logger.info("Department initialization completed successfully")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error initializing departments: {e}")
            return False
    
    async def get_department_by_category(self, db: Session, category: str) -> Optional[str]:
        """Get department name for a given category"""
        try:
            mapping = db.query(CategoryDepartmentMapping).filter(
                CategoryDepartmentMapping.category == category
            ).first()
            
            if mapping:
                return mapping.department_name
            
            # If no specific mapping, return "General"
            return "General"
            
        except Exception as e:
            logger.error(f"Error getting department for category {category}: {e}")
            return "General"
    
    async def get_reports_by_department(self, db: Session, department_name: str, 
                                      status_filter: Optional[str] = None,
                                      urgency_filter: Optional[str] = None) -> List[Report]:
        """Get reports for a specific department"""
        try:
            # Get categories that belong to this department
            categories = db.query(CategoryDepartmentMapping.category).filter(
                CategoryDepartmentMapping.department_name == department_name
            ).all()
            
            category_list = [cat[0] for cat in categories]
            
            # Query reports
            query = db.query(Report).filter(Report.category.in_(category_list))
            
            # Apply filters
            if status_filter:
                query = query.filter(Report.status == status_filter)
            
            if urgency_filter:
                query = query.filter(Report.urgency_label == urgency_filter)
            
            # Sort by urgency score (highest first)
            reports = query.order_by(Report.urgency_score.desc()).all()
            
            logger.info(f"Found {len(reports)} reports for department {department_name}")
            return reports
            
        except Exception as e:
            logger.error(f"Error getting reports for department {department_name}: {e}")
            return []
    
    async def get_other_department_reports(self, db: Session, department_name: str,
                                         status_filter: Optional[str] = None,
                                         urgency_filter: Optional[str] = None) -> List[Report]:
        """Get reports from other departments"""
        try:
            # Get categories that DON'T belong to this department
            categories = db.query(CategoryDepartmentMapping.category).filter(
                CategoryDepartmentMapping.department_name != department_name
            ).all()
            
            category_list = [cat[0] for cat in categories]
            
            # Query reports
            query = db.query(Report).filter(Report.category.in_(category_list))
            
            # Apply filters
            if status_filter:
                query = query.filter(Report.status == status_filter)
            
            if urgency_filter:
                query = query.filter(Report.urgency_label == urgency_filter)
            
            # Sort by urgency score (highest first)
            reports = query.order_by(Report.urgency_score.desc()).all()
            
            logger.info(f"Found {len(reports)} reports from other departments")
            return reports
            
        except Exception as e:
            logger.error(f"Error getting other department reports: {e}")
            return []
    
    async def get_department_stats(self, db: Session, department_name: str) -> Dict:
        """Get statistics for a department"""
        try:
            # Get categories for this department
            categories = db.query(CategoryDepartmentMapping.category).filter(
                CategoryDepartmentMapping.department_name == department_name
            ).all()
            
            category_list = [cat[0] for cat in categories]
            
            # Count reports by status
            stats = db.query(
                Report.status,
                func.count(Report.id)
            ).filter(
                Report.category.in_(category_list)
            ).group_by(Report.status).all()
            
            # Convert to dictionary
            status_counts = {status: count for status, count in stats}
            
            # Get total count
            total_reports = sum(status_counts.values())
            
            return {
                "department": department_name,
                "total_reports": total_reports,
                "status_breakdown": status_counts,
                "pending": status_counts.get("pending", 0),
                "in_progress": status_counts.get("in_progress", 0),
                "resolved": status_counts.get("resolved", 0)
            }
            
        except Exception as e:
            logger.error(f"Error getting stats for department {department_name}: {e}")
            return {
                "department": department_name,
                "total_reports": 0,
                "status_breakdown": {},
                "pending": 0,
                "in_progress": 0,
                "resolved": 0
            }

# Global department service instance
department_service = DepartmentService()
