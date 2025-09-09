#!/usr/bin/env python3
"""
Test script to verify geofencing distance calculation accuracy
"""

import math
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.resolution_service import ResolutionService
from services.exif_service import extract_gps_from_image, validate_gps_coordinates

def test_distance_calculations():
    """Test distance calculations with known coordinates"""
    service = ResolutionService()
    
    # Test cases with known distances (in meters)
    test_cases = [
        {
            "name": "Same location",
            "lat1": 40.7128, "lon1": -74.0060,  # NYC
            "lat2": 40.7128, "lon2": -74.0060,
            "expected_distance": 0.0,
            "tolerance": 1.0
        },
        {
            "name": "30 meters apart (should be valid)",
            "lat1": 40.7128, "lon1": -74.0060,  # NYC
            "lat2": 40.7128, "lon2": -74.0057,  # ~30m east
            "expected_distance": 30.0,
            "tolerance": 5.0
        },
        {
            "name": "100 meters apart (should be invalid)",
            "lat1": 40.7128, "lon1": -74.0060,  # NYC
            "lat2": 40.7128, "lon2": -74.0045,  # ~100m east
            "expected_distance": 100.0,
            "tolerance": 10.0
        },
        {
            "name": "1 kilometer apart",
            "lat1": 40.7128, "lon1": -74.0060,  # NYC
            "lat2": 40.7128, "lon2": -73.9960,  # ~1km east
            "expected_distance": 1000.0,
            "tolerance": 50.0
        }
    ]
    
    print("Testing distance calculations...")
    print("=" * 60)
    
    for test in test_cases:
        distance = service.calculate_distance(
            test["lat1"], test["lon1"],
            test["lat2"], test["lon2"]
        )
        
        is_valid = distance <= service.max_distance_meters
        error = abs(distance - test["expected_distance"])
        
        status = "✓" if error <= test["tolerance"] else "✗"
        
        print(f"{status} {test['name']}")
        print(f"  Coordinates: ({test['lat1']:.6f}, {test['lon1']:.6f}) to ({test['lat2']:.6f}, {test['lon2']:.6f})")
        print(f"  Calculated: {distance:.2f}m")
        print(f"  Expected: {test['expected_distance']:.2f}m")
        print(f"  Error: {error:.2f}m")
        print(f"  Valid (≤{service.max_distance_meters}m): {is_valid}")
        print()

def test_coordinate_validation():
    """Test GPS coordinate validation"""
    print("Testing coordinate validation...")
    print("=" * 60)
    
    test_coords = [
        (40.7128, -74.0060, True, "Valid NYC coordinates"),
        (0.0, 0.0, True, "Valid coordinates at origin"),
        (90.0, 180.0, True, "Valid coordinates at extremes"),
        (-90.0, -180.0, True, "Valid coordinates at negative extremes"),
        (91.0, 0.0, False, "Invalid latitude > 90"),
        (-91.0, 0.0, False, "Invalid latitude < -90"),
        (0.0, 181.0, False, "Invalid longitude > 180"),
        (0.0, -181.0, False, "Invalid longitude < -180"),
    ]
    
    for lat, lon, expected, description in test_coords:
        result = validate_gps_coordinates(lat, lon)
        status = "✓" if result == expected else "✗"
        print(f"{status} {description}: ({lat}, {lon}) -> {result}")

def test_haversine_precision():
    """Test Haversine formula precision with edge cases"""
    service = ResolutionService()
    
    print("\nTesting Haversine precision...")
    print("=" * 60)
    
    # Test edge cases
    edge_cases = [
        {
            "name": "Antipodal points (opposite sides of Earth)",
            "lat1": 0.0, "lon1": 0.0,
            "lat2": 0.0, "lon2": 180.0,
            "expected": 20015000,  # Half Earth's circumference
            "tolerance": 100000
        },
        {
            "name": "Very close points",
            "lat1": 40.7128, "lon1": -74.0060,
            "lat2": 40.7128001, "lon2": -74.0060001,
            "expected": 0.01,  # ~1cm
            "tolerance": 0.1
        },
        {
            "name": "Polar coordinates",
            "lat1": 89.0, "lon1": 0.0,
            "lat2": 89.0, "lon2": 1.0,
            "expected": 111000,  # ~111km per degree at high latitude
            "tolerance": 10000
        }
    ]
    
    for test in edge_cases:
        distance = service.calculate_distance(
            test["lat1"], test["lon1"],
            test["lat2"], test["lon2"]
        )
        
        error = abs(distance - test["expected"])
        status = "✓" if error <= test["tolerance"] else "✗"
        
        print(f"{status} {test['name']}")
        print(f"  Calculated: {distance:.2f}m")
        print(f"  Expected: {test['expected']:.2f}m")
        print(f"  Error: {error:.2f}m")
        print()

if __name__ == "__main__":
    print("Geofencing Accuracy Test Suite")
    print("=" * 60)
    
    test_distance_calculations()
    test_coordinate_validation()
    test_haversine_precision()
    
    print("Test suite completed!")

