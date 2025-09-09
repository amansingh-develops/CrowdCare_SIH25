"""
Report Resolution Service for CrowdCare
Handles report resolution with coordinate verification
"""

import logging
import json
import math
import os
from sqlalchemy.orm import Session
from typing import Optional, Dict, Tuple
from models import Report, User, AdminVerification
from models import FaceVerification
from services.storage_service import upload_image_to_storage, upload_admin_verification_image
from services.exif_service import extract_gps_from_image
from services.status_service import status_service
from fastapi import HTTPException, UploadFile
from sqlalchemy import func

logger = logging.getLogger(__name__)

class ResolutionService:
    def __init__(self):
        # Maximum distance in meters between original and resolution coordinates
        self.max_distance_meters = 30.0  # 30 meters radius as per requirements
        
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate precise distance between two coordinates using Haversine formula
        Returns distance in meters with high precision
        """
        try:
            # Validate input coordinates
            if not (-90 <= lat1 <= 90) or not (-90 <= lat2 <= 90):
                logger.error(f"Invalid latitude values: {lat1}, {lat2}")
                return float('inf')
            if not (-180 <= lon1 <= 180) or not (-180 <= lon2 <= 180):
                logger.error(f"Invalid longitude values: {lon1}, {lon2}")
                return float('inf')
            
            # Convert to radians with high precision
            lat1_rad = math.radians(lat1)
            lon1_rad = math.radians(lon1)
            lat2_rad = math.radians(lat2)
            lon2_rad = math.radians(lon2)
            
            # Haversine formula with enhanced precision
            dlat = lat2_rad - lat1_rad
            dlon = lon2_rad - lon1_rad
            
            # Use more precise calculation
            a = (math.sin(dlat/2)**2 + 
                 math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2)
            
            # Avoid domain errors in asin
            if a > 1.0:
                a = 1.0
            elif a < 0.0:
                a = 0.0
                
            c = 2 * math.asin(math.sqrt(a))
            
            # Earth's radius in meters (WGS84 ellipsoid)
            earth_radius = 6371000.0
            
            distance = earth_radius * c
            
            logger.info(f"Distance calculation: ({lat1:.6f}, {lon1:.6f}) to ({lat2:.6f}, {lon2:.6f}) = {distance:.2f}m")
            return distance
            
        except Exception as e:
            logger.error(f"Error calculating distance: {e}")
            return float('inf')  # Return infinity if calculation fails
    
    async def verify_resolution_location(self, original_lat: float, original_lon: float,
                                       resolution_lat: float, resolution_lon: float) -> Tuple[bool, float]:
        """
        Verify that resolution coordinates are near the original coordinates
        
        Returns:
            Tuple of (is_valid, distance_in_meters)
        """
        try:
            distance = self.calculate_distance(
                original_lat, original_lon,
                resolution_lat, resolution_lon
            )
            
            is_valid = distance <= self.max_distance_meters
            
            logger.info(f"Location verification: distance={distance:.2f}m, valid={is_valid}")
            return is_valid, distance
            
        except Exception as e:
            logger.error(f"Error verifying resolution location: {e}")
            return False, float('inf')
    
    async def resolve_report(self, db: Session, report_id: int, admin_user: User,
                           resolution_image: UploadFile, admin_notes: Optional[str] = None,
                           provided_lat: Optional[float] = None, provided_lon: Optional[float] = None,
                           admin_verification_image: Optional[UploadFile] = None) -> Dict:
        """
        Resolve a report with coordinate verification
        
        Args:
            db: Database session
            report_id: ID of the report to resolve
            admin_user: Admin user resolving the report
            resolution_image: Photo of the resolved issue
            admin_notes: Optional notes from admin
            provided_lat: Provided latitude (fallback)
            provided_lon: Provided longitude (fallback)
        
        Returns:
            Dictionary with resolution status and details
        """
        try:
            # Get the report
            report = db.query(Report).filter(Report.id == report_id).first()
            if not report:
                raise HTTPException(status_code=404, detail="Report not found")
            
            # Check if report is already resolved
            if report.status == "resolved":
                raise HTTPException(status_code=400, detail="Report is already resolved")
            
            # Check for face verification (optional when other requirements are met)
            face_verification_required = os.getenv("FACE_VERIFICATION_REQUIRED", "false").lower() == "true"
            latest_fv = None
            
            if face_verification_required:
                try:
                    latest_fv = db.query(FaceVerification).filter(
                        FaceVerification.report_id == report_id,
                        FaceVerification.admin_id == admin_user.id,
                        FaceVerification.face_verified == True,
                    ).order_by(FaceVerification.verified_at.desc()).first()
                except Exception:
                    latest_fv = None

                if latest_fv is None:
                    raise HTTPException(
                        status_code=403,
                        detail="Face verification required before resolving this report. Set FACE_VERIFICATION_REQUIRED=false to disable this requirement."
                    )
            else:
                logger.info("Face verification is optional - skipping verification check")

            # Read image content for EXIF extraction
            image_content = await resolution_image.read()
            
            # Extract GPS coordinates strictly from the resolution image EXIF
            gps_data = None
            try:
                gps_data = await extract_gps_from_image(image_content)
                logger.info(f"GPS data extracted from resolution image: {gps_data}")
            except Exception as e:
                logger.warning(f"Failed to extract GPS from resolution image: {e}")

            # Enforce EXIF-only GPS requirement with detailed error message
            if not gps_data:
                raise HTTPException(
                    status_code=400,
                    detail="Evidence image must include EXIF GPS data. Please ensure your camera's location services are enabled and take a new photo with GPS coordinates embedded in the image metadata."
                )

            resolution_lat = gps_data['latitude']
            resolution_lon = gps_data['longitude']
            coordinate_source = "EXIF from image"
            
            # Verify location is near the original report location
            is_location_valid, distance = await self.verify_resolution_location(
                report.latitude, report.longitude,
                resolution_lat, resolution_lon
            )
            
            if not is_location_valid:
                raise HTTPException(
                    status_code=400,
                    detail=f"Evidence location too far from reported issue. "
                           f"Distance: {distance:.2f}m, Maximum allowed: {self.max_distance_meters}m. "
                           f"Please take a photo from within {self.max_distance_meters}m of the original location."
                )
            
            # Upload resolution image
            await resolution_image.seek(0)  # Reset file pointer
            resolution_image_url = await upload_image_to_storage(resolution_image, image_content)
            
            # Store resolution coordinates as JSON
            resolution_coords = json.dumps({
                "latitude": resolution_lat,
                "longitude": resolution_lon,
                "distance_from_original_meters": round(distance, 2),
                "coordinate_source": coordinate_source
            })
            
            # Update report status using status service (special method for resolution)
            status_update = await status_service.resolve_report_with_evidence(
                db, report_id, admin_user.id, 
                f"Resolved with geo-verified evidence. Distance: {distance:.2f}m"
            )
            
            # Update resolution-specific fields
            report.resolved_by = admin_user.id
            report.resolved_at = func.now()
            report.resolution_image_url = resolution_image_url
            report.resolution_coordinates = resolution_coords
            report.admin_notes = admin_notes
            
            admin_verification_url = None
            if admin_verification_image is not None:
                # Read and save admin verification selfie
                selfie_bytes = await admin_verification_image.read()
                admin_verification_url = await upload_admin_verification_image(
                    admin_verification_image, selfie_bytes, report_id, admin_user.id
                )

                # Persist admin verification record
                if admin_verification_url:
                    verification = AdminVerification(
                        report_id=report_id,
                        admin_id=admin_user.id,
                        verification_image_url=admin_verification_url
                    )
                    db.add(verification)

            # Commit changes
            db.commit()
            db.refresh(report)
            
            logger.info(f"Report {report_id} resolved successfully by admin {admin_user.id}")
            
            return {
                "success": True,
                "message": "Report resolved successfully",
                "report_id": report_id,
                "resolution_coordinates": resolution_coords,
                "distance_verified": True,
                "distance_meters": round(distance, 2),
                "coordinate_source": coordinate_source,
                "resolution_image_url": resolution_image_url,
                "status_update": status_update,
                "admin_id": admin_user.id,
                "admin_verification_image_url": admin_verification_url
            }
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error resolving report {report_id}: {e}")
            raise HTTPException(
                status_code=500,
                detail="Internal server error while resolving report"
            )
    
    async def get_resolution_details(self, db: Session, report_id: int) -> Optional[Dict]:
        """Get resolution details for a report"""
        try:
            report = db.query(Report).filter(Report.id == report_id).first()
            if not report or report.status != "resolved":
                return None
            
            # Parse resolution coordinates
            resolution_coords = {}
            if report.resolution_coordinates:
                try:
                    resolution_coords = json.loads(report.resolution_coordinates)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid resolution coordinates JSON for report {report_id}")
            
            # Fetch latest admin verification for this report, if any
            verification = None
            try:
                verification = db.query(AdminVerification).filter(
                    AdminVerification.report_id == report_id
                ).order_by(AdminVerification.captured_at.desc()).first()
            except Exception:
                verification = None

            # Optional admin info
            admin_name = None
            try:
                if report.resolved_by:
                    admin_user = db.query(User).filter(User.id == report.resolved_by).first()
                    admin_name = admin_user.full_name if admin_user else None
            except Exception:
                admin_name = None

            return {
                "report_id": report_id,
                "resolved_by": report.resolved_by,
                "resolved_at": report.resolved_at.isoformat() if report.resolved_at else None,
                "resolution_image_url": report.resolution_image_url,
                "resolution_coordinates": resolution_coords,
                "admin_notes": report.admin_notes,
                "admin_verification_image_url": getattr(verification, "verification_image_url", None),
                "admin_id": report.resolved_by,
                "admin_name": admin_name,
                "original_coordinates": {
                    "latitude": report.latitude,
                    "longitude": report.longitude
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting resolution details for report {report_id}: {e}")
            return None

# Global resolution service instance
resolution_service = ResolutionService()
