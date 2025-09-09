#!/usr/bin/env python3
"""
Test script for face verification accuracy
Tests various scenarios to ensure proper face detection
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

def create_test_image_base64(color_rgb=(128, 128, 128), size=(100, 100)):
    """Create a simple test image as base64"""
    try:
        from PIL import Image
        import io
        
        # Create a simple colored image
        img = Image.new('RGB', size, color_rgb)
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        img_bytes = buffer.getvalue()
        
        return base64.b64encode(img_bytes).decode('utf-8')
    except ImportError:
        # Fallback: create a minimal valid JPEG base64
        return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

async def test_face_verification_accuracy():
    """Test face verification accuracy with various scenarios"""
    
    print("Testing Face Verification Accuracy...")
    print("=" * 60)
    
    # Test scenarios
    test_cases = [
        {
            "name": "Empty/Small Image",
            "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "expected": False,
            "description": "1x1 pixel image should be rejected"
        },
        {
            "name": "Solid Color Image",
            "image": create_test_image_base64((255, 0, 0), (200, 200)),
            "expected": False,
            "description": "Solid red image should be rejected"
        },
        {
            "name": "Gray Image",
            "image": create_test_image_base64((128, 128, 128), (300, 300)),
            "expected": False,
            "description": "Solid gray image should be rejected"
        },
        {
            "name": "Invalid Base64",
            "image": "invalid_base64_string",
            "expected": False,
            "description": "Invalid base64 should be rejected"
        }
    ]
    
    print(f"Running {len(test_cases)} test cases...")
    print()
    
    passed = 0
    failed = 0
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"Test {i}: {test_case['name']}")
        print(f"Description: {test_case['description']}")
        
        try:
            result = await face_verification_service.verify_face(test_case['image'])
            actual_result = result.face_detected_locally or result.openai_confirms_human
            
            if actual_result == test_case['expected']:
                print(f"✓ PASS - Expected: {test_case['expected']}, Got: {actual_result}")
                passed += 1
            else:
                print(f"✗ FAIL - Expected: {test_case['expected']}, Got: {actual_result}")
                print(f"  Reason: {result.openai_reason}")
                failed += 1
                
        except Exception as e:
            print(f"✗ ERROR - Exception: {e}")
            failed += 1
        
        print(f"  Face detected locally: {result.face_detected_locally}")
        print(f"  OpenAI confirms human: {result.openai_confirms_human}")
        print(f"  Overall result: {actual_result}")
        print()
    
    print("=" * 60)
    print(f"Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed! Face verification is working accurately.")
    else:
        print("⚠️  Some tests failed. Face verification may be too lenient.")
    
    # Test configuration info
    print("\nConfiguration:")
    print(f"  OpenAI available: {face_verification_service.openai_available}")
    print(f"  OpenCV available: {face_verification_service.opencv_available}")
    print(f"  Bypass enabled: {face_verification_service.allow_bypass}")
    
    return failed == 0

if __name__ == "__main__":
    success = asyncio.run(test_face_verification_accuracy())
    sys.exit(0 if success else 1)
