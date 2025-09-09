#!/usr/bin/env python3
"""
Test script for face verification functionality
"""

import asyncio
import base64
import logging
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.face_verification_service import face_verification_service

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_face_verification():
    """Test the face verification service"""
    
    print("Testing Face Verification Service...")
    print("=" * 50)
    
    # Test 1: Check if OpenAI is configured
    try:
        print("1. Checking OpenAI configuration...")
        # Try to create a simple test
        test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="  # 1x1 pixel image
        result = await face_verification_service.verify_face(test_image_base64)
        print(f"   OpenAI test result: {result}")
    except Exception as e:
        print(f"   OpenAI configuration error: {e}")
        print("   Please ensure OPENAI_API_KEY is set in your environment")
    
    # Test 2: Check OpenCV availability
    print("\n2. Checking OpenCV availability...")
    if face_verification_service.opencv_available:
        print("   ✓ OpenCV is available")
    else:
        print("   ✗ OpenCV is not available (this is okay, will use OpenAI only)")
    
    # Test 3: Test with a real image (if available)
    print("\n3. Testing with sample image...")
    try:
        # Create a simple test image (1x1 pixel)
        test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        result = await face_verification_service.verify_face(test_image_base64)
        print(f"   Test result: {result}")
        print(f"   Face detected locally: {result.face_detected_locally}")
        print(f"   OpenAI confirms human: {result.openai_confirms_human}")
        print(f"   Overall verification: {result.is_verified}")
        print(f"   Reason: {result.openai_reason}")
    except Exception as e:
        print(f"   Test failed: {e}")
    
    print("\n" + "=" * 50)
    print("Face verification test completed!")

if __name__ == "__main__":
    asyncio.run(test_face_verification())
