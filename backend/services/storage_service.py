import os
import uuid
from datetime import datetime
from typing import Optional
import logging
from fastapi import UploadFile
from pathlib import Path

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        # For development, use local file storage
        self.storage_type = "local"
        self.uploads_dir = Path("uploads")
        self.uploads_dir.mkdir(exist_ok=True)
        logger.info("Local storage service initialized successfully")

    async def upload_file(self, file: UploadFile, file_content: bytes) -> str:
        """
        Upload file to local storage.
        
        Args:
            file: FastAPI UploadFile object
            file_content: File content as bytes
        
        Returns:
            URL of the uploaded file
        """
        try:
            # Generate unique filename
            file_extension = os.path.splitext(file.filename)[1] if file.filename else '.jpg'
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            # Create folder structure by date (use forward slashes for cross-platform compatibility)
            date_folder = datetime.now().strftime("%Y/%m/%d")
            date_dir = self.uploads_dir / date_folder.replace('/', os.sep)
            date_dir.mkdir(parents=True, exist_ok=True)
            
            # Save file locally
            file_path = date_dir / unique_filename
            with open(file_path, 'wb') as f:
                f.write(file_content)
            
            # Return local file URL (use forward slashes for URLs)
            file_url = f"/uploads/{date_folder}/{unique_filename}"
            
            logger.info(f"File saved locally: {file_path}")
            return file_url
            
        except Exception as e:
            logger.error(f"Error saving file locally: {e}")
            # Fallback to placeholder URL
            return "https://placeholder.com/image.jpg"

    async def upload_admin_verification(self, file: UploadFile, file_content: bytes,
                                        report_id: int, admin_id: str) -> str:
        """
        Save admin verification selfie under uploads/admin_verifications with deterministic name.

        Returns the URL path suitable for serving via FastAPI static mount.
        """
        try:
            # Ensure directory exists
            target_dir = self.uploads_dir / "admin_verifications"
            target_dir.mkdir(parents=True, exist_ok=True)

            # Normalize extension
            ext = os.path.splitext(file.filename or "")[1].lower()
            if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
                ext = ".jpg"

            # Deterministic but unique-ish filename
            filename = f"{report_id}_{admin_id}{ext}"
            file_path = target_dir / filename
            with open(file_path, 'wb') as f:
                f.write(file_content)

            # URL uses forward slashes
            return f"/uploads/admin_verifications/{filename}"
        except Exception as e:
            logger.error(f"Error saving admin verification image: {e}")
            return ""

    async def upload_face_verification_image(self, *, image_bytes: bytes, report_id: int, who_id: str) -> str:
        """Save base64/webcam-captured verification image to uploads/admin_verifications (or generic folder)."""
        try:
            target_dir = self.uploads_dir / "admin_verifications"
            target_dir.mkdir(parents=True, exist_ok=True)

            # Write as JPEG
            filename = f"{report_id}_{who_id}.jpg"
            file_path = target_dir / filename
            with open(file_path, 'wb') as f:
                f.write(image_bytes)

            return f"/uploads/admin_verifications/{filename}"
        except Exception as e:
            logger.error(f"Error saving face verification image: {e}")
            return ""
    
    async def delete_file(self, file_url: str) -> bool:
        """
        Delete file from local storage.
        
        Args:
            file_url: URL of the file to delete
        
        Returns:
            True if deletion successful, False otherwise
        """
        try:
            # Extract file path from URL
            if file_url.startswith('/uploads/'):
                file_path = self.uploads_dir / file_url.replace('/uploads/', '')
                if file_path.exists():
                    file_path.unlink()
                    logger.info(f"File deleted successfully: {file_url}")
                    return True
            return False
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            return False

# Global storage service instance
storage_service = StorageService()

async def upload_image_to_storage(file: UploadFile, file_content: bytes) -> str:
    """
    Upload image to storage and return URL.
    
    Args:
        file: FastAPI UploadFile object
        file_content: File content as bytes
    
    Returns:
        URL of the uploaded image
    """
    return await storage_service.upload_file(file, file_content)

async def upload_admin_verification_image(file: UploadFile, file_content: bytes,
                                          report_id: int, admin_id: str) -> str:
    """Helper to save admin verification selfie and return URL path."""
    return await storage_service.upload_admin_verification(file, file_content, report_id, admin_id)

async def delete_image_from_storage(file_url: str) -> bool:
    """
    Delete image from storage.
    
    Args:
        file_url: URL of the image to delete
    
    Returns:
        True if deletion successful, False otherwise
    """
    return await storage_service.delete_file(file_url)
