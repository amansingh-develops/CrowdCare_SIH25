"""
Face Verification Service
Uses OpenCV for local face detection (if available) and OpenAI Vision for human verification.
Gracefully degrades to OpenAI-only verification when OpenCV is unavailable.
"""

import base64
import io
import logging
import os
from dataclasses import dataclass
from typing import Optional, Tuple

from openai import OpenAI  # type: ignore


logger = logging.getLogger(__name__)


@dataclass
class FaceVerificationResult:
    face_detected_locally: bool
    openai_confirms_human: bool
    openai_reason: Optional[str] = None

    @property
    def is_verified(self) -> bool:
        return self.face_detected_locally and self.openai_confirms_human


class FaceVerificationService:
    def __init__(self) -> None:
        # Configuration: Allow bypassing verification if needed
        self.allow_bypass = os.getenv("FACE_VERIFICATION_BYPASS", "false").lower() == "true"
        
        # Attempt to initialize OpenCV lazily; handle absence gracefully
        self.opencv_available = False
        self.face_cascade = None
        try:
            import cv2  # type: ignore
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            face_cascade = cv2.CascadeClassifier(cascade_path)
            if not face_cascade.empty():
                self.face_cascade = face_cascade
                self.opencv_available = True
            else:
                logger.warning("OpenCV loaded but Haar cascade not found; skipping local face detection")
        except Exception as e:
            logger.warning(f"OpenCV not available; will use OpenAI-only verification. Details: {e}")

        # Initialize OpenAI client (requires OPENAI_API_KEY)
        self.openai_available = False
        self.openai_client = None
        try:
            self.openai_client = OpenAI()
            self.openai_available = True
            logger.info("OpenAI client initialized successfully")
        except Exception as e:
            logger.warning(f"OpenAI not available: {e}")
            if not self.allow_bypass and not self.opencv_available:
                logger.error("Face verification requires either OpenAI API key, OpenCV, or FACE_VERIFICATION_BYPASS=true")
                raise

    def _decode_base64_image(self, image_base64: str):
        """Decode base64 image; returns (opencv_image_or_None, raw_bytes)."""
        try:
            # Strip data URL prefix if present
            if "," in image_base64 and image_base64.strip().startswith("data:"):
                image_base64 = image_base64.split(",", 1)[1]
            image_bytes = base64.b64decode(image_base64)
            if self.opencv_available:
                try:
                    import numpy as np  # type: ignore
                    import cv2  # type: ignore
                    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
                    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
                    return image, image_bytes
                except Exception as e:
                    logger.warning(f"Failed to decode image for OpenCV path; falling back to bytes only: {e}")
            return None, image_bytes
        except Exception as e:
            logger.warning(f"Error decoding base64 image: {e}")
            # Return None for both image and bytes to indicate failure
            return None, None

    def _detect_face_opencv(self, image) -> bool:
        """Run local face detection using Haar cascades with strict parameters."""
        try:
            if not self.opencv_available or self.face_cascade is None or image is None:
                return False
            import cv2  # type: ignore
            import numpy as np  # type: ignore
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Use stricter parameters for better accuracy
            faces = self.face_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.05,  # Smaller steps for better detection
                minNeighbors=8,    # More neighbors required (stricter)
                minSize=(80, 80),  # Larger minimum size
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            
            # Additional validation: check if detected faces are reasonable
            if len(faces) > 0:
                # Get the largest face
                largest_face = max(faces, key=lambda x: x[2] * x[3])
                x, y, w, h = largest_face
                
                # Check if face is reasonably sized relative to image
                img_height, img_width = gray.shape
                face_area = w * h
                img_area = img_width * img_height
                face_ratio = face_area / img_area
                
                # Face should be at least 5% of the image and not more than 80%
                if 0.05 <= face_ratio <= 0.8:
                    logger.info(f"OpenCV detected valid face: {len(faces)} faces, largest: {w}x{h}, ratio: {face_ratio:.3f}")
                    return True
                else:
                    logger.warning(f"OpenCV detected face but size ratio invalid: {face_ratio:.3f}")
                    return False
            
            logger.info("OpenCV: No faces detected")
            return False
            
        except Exception as e:
            logger.error(f"OpenCV face detection error: {e}")
            return False

    async def _verify_with_openai(self, image_bytes: bytes) -> Tuple[bool, Optional[str]]:
        """Call OpenAI Vision to confirm the image contains a live human face."""
        if not self.openai_available or self.openai_client is None:
            return False, "OpenAI client not available"
            
        try:
            # Use Chat Completions API with vision-capable model
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            prompt = (
                "Analyze this image carefully and determine if it contains a clear, visible human face. "
                "A valid human face must have: eyes, nose, and mouth clearly visible. "
                "Do NOT accept: photos of photos, screens, drawings, cartoons, animals, objects, or unclear/blurry images. "
                "Do NOT accept: images where the face is completely obscured, turned away, or too small to identify. "
                "Only return 'true' if you can clearly see a human face with recognizable facial features. "
                "Return 'false' for anything else."
            )

            resp = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{b64}"
                                }
                            }
                        ],
                    }
                ],
                max_tokens=10
            )

            text = (resp.choices[0].message.content or "").strip().lower()
            
            # Strict parsing - only accept exact "true" or "false"
            if text == "true":
                is_true = True
            elif text == "false":
                is_true = False
            else:
                # If response is unclear, default to false for safety
                logger.warning(f"OpenAI returned unclear response: '{text}', defaulting to false")
                is_true = False
            
            logger.info(f"OpenAI vision verification result: {text} -> {is_true}")
            return is_true, text
        except Exception as e:
            logger.error(f"OpenAI vision verification error: {e}")
            return False, None

    async def verify_face(self, image_base64: str) -> FaceVerificationResult:
        """
        Verify face presence and human-ness with strict accuracy.
        Requires at least one method to confirm a human face is present.
        """
        image, image_bytes = self._decode_base64_image(image_base64)
        
        # Validate that we have a reasonable image
        if image_bytes is None:
            logger.warning("Failed to decode image")
            return FaceVerificationResult(face_detected_locally=False, openai_confirms_human=False, openai_reason="Failed to decode image")
        
        if len(image_bytes) < 1000:
            logger.warning("Image too small")
            return FaceVerificationResult(face_detected_locally=False, openai_confirms_human=False, openai_reason="Image too small")
        
        openai_result = False
        opencv_result = False
        openai_reason = None
        
        # Try OpenAI verification first (most reliable for human detection)
        if self.openai_available:
            try:
                openai_result, openai_reason = await self._verify_with_openai(image_bytes)
                logger.info(f"OpenAI verification result: {openai_result}, reason: {openai_reason}")
            except Exception as e:
                logger.warning(f"OpenAI verification failed: {e}")
                openai_reason = f"OpenAI error: {str(e)}"
        
        # Try OpenCV face detection
        if self.opencv_available and image is not None:
            opencv_result = self._detect_face_opencv(image)
            logger.info(f"OpenCV face detection result: {opencv_result}")
        
        # Determine final result based on available methods
        if self.openai_available and self.opencv_available:
            # Both methods available - require at least one to succeed
            if openai_result or opencv_result:
                final_reason = f"OpenAI: {openai_result}, OpenCV: {opencv_result}"
                return FaceVerificationResult(face_detected_locally=opencv_result, openai_confirms_human=openai_result, openai_reason=final_reason)
            else:
                return FaceVerificationResult(face_detected_locally=False, openai_confirms_human=False, openai_reason=f"Both methods failed - OpenAI: {openai_reason}, OpenCV: no face detected")
        
        elif self.openai_available:
            # Only OpenAI available - require it to succeed
            if openai_result:
                return FaceVerificationResult(face_detected_locally=True, openai_confirms_human=True, openai_reason=openai_reason)
            else:
                return FaceVerificationResult(face_detected_locally=False, openai_confirms_human=False, openai_reason=f"OpenAI failed: {openai_reason}")
        
        elif self.opencv_available:
            # Only OpenCV available - require it to succeed
            if opencv_result:
                return FaceVerificationResult(face_detected_locally=True, openai_confirms_human=False, openai_reason="OpenCV face detected")
            else:
                return FaceVerificationResult(face_detected_locally=False, openai_confirms_human=False, openai_reason="OpenCV: no face detected")
        
        # If bypass is enabled, allow the verification to pass
        if self.allow_bypass:
            logger.warning("Face verification bypassed due to configuration")
            return FaceVerificationResult(face_detected_locally=True, openai_confirms_human=False, openai_reason="Verification bypassed by configuration")
        
        # No verification methods available
        logger.error("No face verification methods available")
        return FaceVerificationResult(face_detected_locally=False, openai_confirms_human=False, openai_reason="No verification methods available")


# Global instance
face_verification_service = FaceVerificationService()


