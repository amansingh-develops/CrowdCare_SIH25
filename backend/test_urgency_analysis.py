"""
Test script for the enhanced AI urgency analysis system
"""

import asyncio
import json
from datetime import datetime
from services.ai_service import ai_service, AIClassificationRequest

async def test_urgency_analysis():
    """Test the enhanced urgency analysis with various scenarios"""
    
    print("🧪 Testing Enhanced AI Urgency Analysis System")
    print("=" * 60)
    
    # Test scenarios with different combinations of factors
    test_cases = [
        {
            "name": "Critical Traffic Signal Issue",
            "request": AIClassificationRequest(
                title="Broken Traffic Signal at Main Intersection",
                description="Traffic signal completely broken, causing major traffic chaos during rush hour. Multiple near-miss accidents reported.",
                category="Traffic Signal",
                mcq_responses={
                    "severity": "Critical",
                    "duration": "1 day",
                    "affectedArea": "Traffic flow"
                },
                latitude=28.6139,
                longitude=77.2090,
                reporter_name="John Doe",
                reporter_email="john@example.com",
                reporting_time=datetime.now().isoformat(),
                image_description="Broken traffic signal with heavy traffic"
            )
        },
        {
            "name": "Low Priority Sidewalk Issue",
            "request": AIClassificationRequest(
                title="Minor Sidewalk Crack",
                description="Small crack in sidewalk, not affecting pedestrian movement significantly.",
                category="Sidewalk",
                mcq_responses={
                    "severity": "Low",
                    "duration": "1 week",
                    "affectedArea": "Few people"
                },
                latitude=28.6139,
                longitude=77.2090,
                reporter_name="Jane Smith",
                reporter_email="jane@example.com",
                reporting_time=datetime.now().isoformat(),
                image_description="Minor sidewalk crack"
            )
        },
        {
            "name": "High Priority Waterlogging",
            "request": AIClassificationRequest(
                title="Severe Waterlogging Blocking Main Road",
                description="Heavy waterlogging after rain, completely blocking main road access. Vehicles unable to pass through.",
                category="Waterlogging",
                mcq_responses={
                    "severity": "High",
                    "duration": "2 weeks",
                    "affectedArea": "Entire area"
                },
                latitude=19.0760,
                longitude=72.8777,
                reporter_name="Mike Johnson",
                reporter_email="mike@example.com",
                reporting_time=datetime.now().isoformat(),
                image_description="Severe waterlogging blocking road"
            )
        },
        {
            "name": "Medium Priority Pothole",
            "request": AIClassificationRequest(
                title="Large Pothole on Residential Street",
                description="Large pothole causing vehicle damage. Reported by multiple residents.",
                category="Pothole",
                mcq_responses={
                    "severity": "Medium",
                    "duration": "1 month",
                    "affectedArea": "Many people"
                },
                latitude=12.9716,
                longitude=77.5946,
                reporter_name="Sarah Wilson",
                reporter_email="sarah@example.com",
                reporting_time=datetime.now().isoformat(),
                image_description="Large pothole on street"
            )
        },
        {
            "name": "Emergency Streetlight Issue",
            "request": AIClassificationRequest(
                title="Streetlight Down - Safety Hazard",
                description="Streetlight completely down in dark area near school. Safety concern for children and pedestrians.",
                category="Streetlight",
                mcq_responses={
                    "severity": "High",
                    "duration": "Just noticed",
                    "affectedArea": "Pedestrians only"
                },
                latitude=13.0827,
                longitude=80.2707,
                reporter_name="David Brown",
                reporter_email="david@example.com",
                reporting_time=datetime.now().isoformat(),
                image_description="Downed streetlight near school"
            )
        }
    ]
    
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📋 Test Case {i}: {test_case['name']}")
        print("-" * 40)
        
        try:
            # Test the classification
            result = await ai_service.classify_urgency(test_case['request'])
            
            print(f"✅ Classification Result:")
            print(f"   Urgency Score: {result.urgency_score}/100")
            print(f"   Urgency Label: {result.urgency_label}")
            print(f"   Reasoning: {result.reasoning}")
            
            # Store result for analysis
            results.append({
                "test_case": test_case['name'],
                "urgency_score": result.urgency_score,
                "urgency_label": result.urgency_label,
                "reasoning": result.reasoning
            })
            
        except Exception as e:
            print(f"❌ Error in test case {i}: {str(e)}")
            results.append({
                "test_case": test_case['name'],
                "error": str(e)
            })
    
    # Summary analysis
    print("\n" + "=" * 60)
    print("📊 SUMMARY ANALYSIS")
    print("=" * 60)
    
    successful_tests = [r for r in results if "error" not in r]
    failed_tests = [r for r in results if "error" in r]
    
    print(f"✅ Successful Tests: {len(successful_tests)}/{len(test_cases)}")
    print(f"❌ Failed Tests: {len(failed_tests)}")
    
    if successful_tests:
        print("\n📈 Urgency Score Distribution:")
        scores = [r['urgency_score'] for r in successful_tests]
        labels = [r['urgency_label'] for r in successful_tests]
        
        for i, (score, label) in enumerate(zip(scores, labels)):
            print(f"   {successful_tests[i]['test_case']}: {score}/100 ({label})")
        
        print(f"\n📊 Statistics:")
        print(f"   Average Score: {sum(scores)/len(scores):.1f}")
        print(f"   Min Score: {min(scores)}")
        print(f"   Max Score: {max(scores)}")
        
        # Check if results make sense
        print(f"\n🎯 Validation:")
        critical_high = [r for r in successful_tests if r['urgency_score'] >= 75]
        medium_low = [r for r in successful_tests if r['urgency_score'] < 75]
        
        print(f"   High Priority Issues (≥75): {len(critical_high)}")
        for r in critical_high:
            print(f"     - {r['test_case']}: {r['urgency_score']}/100")
        
        print(f"   Medium/Low Priority Issues (<75): {len(medium_low)}")
        for r in medium_low:
            print(f"     - {r['test_case']}: {r['urgency_score']}/100")
    
    if failed_tests:
        print(f"\n❌ Failed Test Details:")
        for r in failed_tests:
            print(f"   - {r['test_case']}: {r['error']}")
    
    print(f"\n🎉 Test completed! Enhanced urgency analysis system is {'working correctly' if len(successful_tests) >= len(test_cases) * 0.8 else 'needs attention'}.")

if __name__ == "__main__":
    asyncio.run(test_urgency_analysis())
