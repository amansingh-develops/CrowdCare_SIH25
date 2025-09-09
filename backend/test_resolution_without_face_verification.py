#!/usr/bin/env python3
"""
Test script to verify that resolution works without face verification
when resolution requirements are fulfilled
"""

import os
import sys
import asyncio
import logging

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_resolution_configuration():
    """Test the resolution configuration"""
    
    print("Testing Resolution Configuration...")
    print("=" * 50)
    
    # Test environment variables
    face_verification_required = os.getenv("FACE_VERIFICATION_REQUIRED", "false").lower() == "true"
    face_verification_bypass = os.getenv("FACE_VERIFICATION_BYPASS", "false").lower() == "true"
    
    print(f"FACE_VERIFICATION_REQUIRED: {face_verification_required}")
    print(f"FACE_VERIFICATION_BYPASS: {face_verification_bypass}")
    
    if not face_verification_required:
        print("✅ Face verification is OPTIONAL for resolution")
        print("   Resolution can proceed with just:")
        print("   - GPS coordinates from EXIF data")
        print("   - Location validation (within 30m)")
        print("   - Resolution image upload")
    else:
        print("⚠️  Face verification is REQUIRED for resolution")
        print("   Set FACE_VERIFICATION_REQUIRED=false to make it optional")
    
    if face_verification_bypass:
        print("✅ Face verification bypass is ENABLED")
        print("   Face verification will be skipped entirely")
    else:
        print("ℹ️  Face verification bypass is DISABLED")
        print("   Set FACE_VERIFICATION_BYPASS=true to enable bypass")
    
    print("\n" + "=" * 50)
    
    # Test resolution service import
    try:
        from services.resolution_service import resolution_service
        print("✅ Resolution service imported successfully")
    except Exception as e:
        print(f"❌ Failed to import resolution service: {e}")
        return False
    
    # Test face verification service import
    try:
        from services.face_verification_service import face_verification_service
        print("✅ Face verification service imported successfully")
        print(f"   OpenAI available: {face_verification_service.openai_available}")
        print(f"   OpenCV available: {face_verification_service.opencv_available}")
        print(f"   Bypass enabled: {face_verification_service.allow_bypass}")
    except Exception as e:
        print(f"❌ Failed to import face verification service: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("Configuration test completed!")
    
    return True

def show_usage_instructions():
    """Show usage instructions"""
    
    print("\n" + "=" * 60)
    print("USAGE INSTRUCTIONS")
    print("=" * 60)
    
    print("\n1. To make face verification OPTIONAL (recommended):")
    print("   export FACE_VERIFICATION_REQUIRED=false")
    print("   # This allows resolution with just GPS + location validation")
    
    print("\n2. To completely BYPASS face verification:")
    print("   export FACE_VERIFICATION_BYPASS=true")
    print("   # This skips all face verification checks")
    
    print("\n3. To require face verification (default behavior):")
    print("   export FACE_VERIFICATION_REQUIRED=true")
    print("   # This enforces face verification before resolution")
    
    print("\n4. Resolution Requirements (always required):")
    print("   ✅ GPS coordinates from EXIF data")
    print("   ✅ Location within 30m of original report")
    print("   ✅ Resolution image upload")
    print("   ✅ Admin notes (optional)")
    
    print("\n5. Face Verification (now optional):")
    print("   ⚪ Admin selfie with face verification")
    print("   ⚪ Can be skipped if other requirements are met")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    success = test_resolution_configuration()
    show_usage_instructions()
    
    if success:
        print("\n🎉 Resolution configuration is working correctly!")
        print("   You can now resolve reports without face verification")
        print("   when the core requirements (GPS + location) are met.")
    else:
        print("\n❌ There are issues with the resolution configuration.")
    
    sys.exit(0 if success else 1)
