import piexif
from PIL import Image
import io
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

def dms_to_decimal(dms_tuple: tuple, ref: str) -> float:
    """
    Convert GPS coordinates from DMS (Degrees, Minutes, Seconds) format to decimal degrees.
    
    Args:
        dms_tuple: Tuple of (degrees, minutes, seconds) as rational numbers
        ref: Reference direction ('N', 'S', 'E', 'W')
    
    Returns:
        Decimal degrees as float
    """
    try:
        # Convert rational numbers to float
        degrees = float(dms_tuple[0][0]) / float(dms_tuple[0][1])
        minutes = float(dms_tuple[1][0]) / float(dms_tuple[1][1])
        seconds = float(dms_tuple[2][0]) / float(dms_tuple[2][1])
        
        # Calculate decimal degrees
        decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
        
        # Apply direction reference
        if ref in ['S', 'W']:
            decimal = -decimal
            
        return decimal
    except (ZeroDivisionError, IndexError, TypeError) as e:
        logger.error(f"Error converting DMS to decimal: {e}")
        raise ValueError(f"Invalid DMS format: {dms_tuple}")

async def extract_gps_from_image(image_bytes: bytes) -> Optional[Dict[str, float]]:
    """
    Extract GPS coordinates from image EXIF data with enhanced error handling.
    
    Args:
        image_bytes: Raw image bytes
    
    Returns:
        Dictionary with 'latitude' and 'longitude' keys, or None if no GPS data found
    """
    try:
        logger.info(f"Starting GPS extraction from image, size: {len(image_bytes)} bytes")
        
        # Validate input
        if not image_bytes or len(image_bytes) == 0:
            logger.warning("Empty image bytes provided")
            return None
        
        # Open image from bytes
        try:
            image = Image.open(io.BytesIO(image_bytes))
            logger.info(f"Image opened successfully, format: {image.format}, size: {image.size}")
        except Exception as e:
            logger.error(f"Failed to open image: {e}")
            return None
        
        # Check if image has EXIF data
        if not hasattr(image, '_getexif') or image._getexif() is None:
            logger.info("No EXIF data found in image")
            return None
        
        logger.info("EXIF data found, attempting to load with piexif")
        
        # Get EXIF data with error handling
        try:
            exif_dict = piexif.load(image.info['exif'])
            logger.info(f"EXIF data loaded, keys: {list(exif_dict.keys())}")
        except Exception as e:
            logger.error(f"Failed to load EXIF data: {e}")
            return None
        
        # Check if GPS data exists
        if 'GPS' not in exif_dict:
            logger.info("No GPS data found in EXIF")
            return None
        
        gps_data = exif_dict['GPS']
        logger.info(f"GPS data found, keys: {list(gps_data.keys())}")
        
        # Extract GPS coordinates with enhanced validation
        latitude = None
        longitude = None
        
        # GPS Latitude
        try:
            if piexif.GPSIFD.GPSLatitude in gps_data and piexif.GPSIFD.GPSLatitudeRef in gps_data:
                lat_dms = gps_data[piexif.GPSIFD.GPSLatitude]
                lat_ref = gps_data[piexif.GPSIFD.GPSLatitudeRef].decode('utf-8')
                logger.info(f"Latitude DMS: {lat_dms}, Ref: {lat_ref}")
                latitude = dms_to_decimal(lat_dms, lat_ref)
                logger.info(f"Latitude decimal: {latitude}")
        except Exception as e:
            logger.error(f"Error extracting latitude: {e}")
        
        # GPS Longitude
        try:
            if piexif.GPSIFD.GPSLongitude in gps_data and piexif.GPSIFD.GPSLongitudeRef in gps_data:
                lon_dms = gps_data[piexif.GPSIFD.GPSLongitude]
                lon_ref = gps_data[piexif.GPSIFD.GPSLongitudeRef].decode('utf-8')
                logger.info(f"Longitude DMS: {lon_dms}, Ref: {lon_ref}")
                longitude = dms_to_decimal(lon_dms, lon_ref)
                logger.info(f"Longitude decimal: {longitude}")
        except Exception as e:
            logger.error(f"Error extracting longitude: {e}")
        
        # Validate coordinates with enhanced checks
        if latitude is not None and longitude is not None:
            # Check coordinate ranges
            if not (-90 <= latitude <= 90):
                logger.warning(f"Invalid latitude: {latitude} (must be between -90 and 90)")
                return None
            if not (-180 <= longitude <= 180):
                logger.warning(f"Invalid longitude: {longitude} (must be between -180 and 180)")
                return None
            
            # Check for obviously invalid coordinates (e.g., 0,0 which is often default)
            if latitude == 0.0 and longitude == 0.0:
                logger.warning("GPS coordinates are 0,0 which is likely invalid")
                return None
            
            logger.info(f"Successfully extracted and validated GPS coordinates: {latitude}, {longitude}")
            return {
                'latitude': latitude,
                'longitude': longitude
            }
        
        logger.info("GPS coordinates not found or invalid in EXIF data")
        return None
        
    except Exception as e:
        logger.error(f"Error extracting GPS from image: {e}")
        return None

def validate_gps_coordinates(latitude: float, longitude: float) -> bool:
    """
    Validate GPS coordinates are within valid ranges.
    
    Args:
        latitude: Latitude coordinate
        longitude: Longitude coordinate
    
    Returns:
        True if coordinates are valid, False otherwise
    """
    return (-90 <= latitude <= 90) and (-180 <= longitude <= 180)
