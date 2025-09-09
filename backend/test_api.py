#!/usr/bin/env python3
"""
Simple test script for the CrowdCare FastAPI backend.
"""
import requests
import json
import os
from pathlib import Path

# API base URL
BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test the health check endpoint."""
    print("Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_create_report():
    """Test creating a report with image upload."""
    print("Testing report creation...")
    
    # Create a simple test image (1x1 pixel PNG)
    test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
    
    # Prepare form data
    files = {
        'image': ('test.png', test_image_data, 'image/png')
    }
    
    data = {
        'title': 'Test Issue',
        'description': 'This is a test issue for API validation',
        'category': 'Other',
        'latitude': '22.7512',
        'longitude': '75.8754'
    }
    
    try:
        response = requests.post(f"{BASE_URL}/reports/create", files=files, data=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the API. Make sure the server is running.")
    except Exception as e:
        print(f"Error: {e}")
    print()

def test_get_reports():
    """Test getting all reports."""
    print("Testing get reports...")
    try:
        response = requests.get(f"{BASE_URL}/reports")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the API. Make sure the server is running.")
    except Exception as e:
        print(f"Error: {e}")
    print()

def main():
    """Run all tests."""
    print("CrowdCare API Test Suite")
    print("=" * 50)
    
    test_health_check()
    test_create_report()
    test_get_reports()
    
    print("Test suite completed!")

if __name__ == "__main__":
    main()
