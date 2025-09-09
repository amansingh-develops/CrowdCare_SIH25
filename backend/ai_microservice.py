"""
AI Microservice for CrowdCare
Handles comprehensive urgency analysis using multiple factors
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging
from datetime import datetime
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CrowdCare AI Microservice", version="1.0.0")

class ClassificationRequest(BaseModel):
    report_content: Dict[str, Any]
    citizen_inputs: Dict[str, Any]
    location_context: Dict[str, Any]

class ClassificationResponse(BaseModel):
    urgency_score: int
    urgency_label: str
    reasoning: str
    confidence: float
    factors_analyzed: Dict[str, Any]

class SummaryRequest(BaseModel):
    category: str
    reporting_time: str
    latitude: float
    longitude: float
    mcq_responses: Dict[str, Any]
    image_description: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None

class SummaryResponse(BaseModel):
    title: str
    description: str
    tags: list

@app.post("/classify", response_model=ClassificationResponse)
async def classify_urgency(request: ClassificationRequest):
    """
    Comprehensive urgency classification using multiple factors
    """
    try:
        # Extract data from request
        report_content = request.report_content
        citizen_inputs = request.citizen_inputs
        location_context = request.location_context
        
        # Analyze each factor
        category_score = _analyze_category_urgency(report_content.get("category", "Other"))
        severity_score = _analyze_severity_urgency(citizen_inputs.get("severity", "Medium"))
        duration_score = _analyze_duration_urgency(citizen_inputs.get("duration", "1 day"))
        area_score = _analyze_area_urgency(citizen_inputs.get("affected_area", "Few people"))
        time_score = _analyze_time_urgency(location_context.get("reporting_time"))
        location_score = _analyze_location_urgency(
            location_context.get("latitude", 0),
            location_context.get("longitude", 0)
        )
        content_score = _analyze_content_urgency(
            report_content.get("title", ""),
            report_content.get("description", "")
        )
        
        # Calculate weighted final score
        weights = {
            "category": 0.25,
            "severity": 0.20,
            "duration": 0.15,
            "area": 0.15,
            "time": 0.10,
            "location": 0.10,
            "content": 0.05
        }
        
        final_score = int(
            category_score * weights["category"] +
            severity_score * weights["severity"] +
            duration_score * weights["duration"] +
            area_score * weights["area"] +
            time_score * weights["time"] +
            location_score * weights["location"] +
            content_score * weights["content"]
        )
        
        # Clamp score between 1-100
        final_score = max(1, min(100, final_score))
        
        # Determine urgency label
        if final_score >= 90:
            urgency_label = "Critical"
        elif final_score >= 75:
            urgency_label = "High"
        elif final_score >= 50:
            urgency_label = "Medium"
        elif final_score >= 25:
            urgency_label = "Low"
        else:
            urgency_label = "Very Low"
        
        # Calculate confidence based on data completeness
        confidence = _calculate_confidence(citizen_inputs, location_context)
        
        # Generate detailed reasoning
        reasoning = _generate_detailed_reasoning(
            category_score, severity_score, duration_score, area_score,
            time_score, location_score, content_score, final_score, urgency_label
        )
        
        # Prepare factors analyzed
        factors_analyzed = {
            "category_score": category_score,
            "severity_score": severity_score,
            "duration_score": duration_score,
            "area_score": area_score,
            "time_score": time_score,
            "location_score": location_score,
            "content_score": content_score,
            "weights_applied": weights
        }
        
        return ClassificationResponse(
            urgency_score=final_score,
            urgency_label=urgency_label,
            reasoning=reasoning,
            confidence=confidence,
            factors_analyzed=factors_analyzed
        )
        
    except Exception as e:
        logger.error(f"Error in urgency classification: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

@app.post("/summarize", response_model=SummaryResponse)
async def generate_summary(request: SummaryRequest):
    """
    Generate AI-powered summary for reports
    """
    try:
        # Generate title based on category and severity
        title = _generate_title(request.category, request.mcq_responses.get("severity", "Medium"))
        
        # Generate comprehensive description
        description = _generate_description(request)
        
        # Generate relevant tags
        tags = _generate_tags(request.category, request.mcq_responses)
        
        return SummaryResponse(
            title=title,
            description=description,
            tags=tags
        )
        
    except Exception as e:
        logger.error(f"Error in summary generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")

def _analyze_category_urgency(category: str) -> int:
    """Analyze category-based urgency (0-100)"""
    category_weights = {
        "Traffic Signal": 90,
        "Waterlogging": 85,
        "Pothole": 80,
        "Road Issue": 75,
        "Drainage": 70,
        "Streetlight": 60,
        "Garbage": 55,
        "Sidewalk": 45,
        "Other": 50
    }
    return category_weights.get(category, 50)

def _analyze_severity_urgency(severity: str) -> int:
    """Analyze severity-based urgency (0-100)"""
    severity_weights = {
        "Critical": 95,
        "High": 80,
        "Medium": 60,
        "Low": 30
    }
    return severity_weights.get(severity, 60)

def _analyze_duration_urgency(duration: str) -> int:
    """Analyze duration-based urgency (0-100)"""
    duration_weights = {
        "Just noticed": 40,
        "1 day": 50,
        "1 week": 65,
        "2 weeks": 75,
        "1 month": 85,
        "More than 1 month": 95
    }
    return duration_weights.get(duration, 50)

def _analyze_area_urgency(affected_area: str) -> int:
    """Analyze affected area urgency (0-100)"""
    area_weights = {
        "Few people": 30,
        "Many people": 60,
        "Entire area": 85,
        "Traffic flow": 80,
        "Pedestrians only": 40
    }
    return area_weights.get(affected_area, 50)

def _analyze_time_urgency(reporting_time: Optional[str]) -> int:
    """Analyze time-based urgency (0-100)"""
    if not reporting_time:
        return 50
        
    try:
        report_time = datetime.fromisoformat(reporting_time.replace('Z', '+00:00'))
        hour = report_time.hour
        weekday = report_time.weekday()
        
        # Rush hour and night time have higher urgency
        if weekday < 5:  # Weekdays
            if 7 <= hour <= 9 or 17 <= hour <= 19:  # Rush hours
                return 80
            elif 22 <= hour <= 6:  # Night time
                return 70
            else:
                return 50
        else:  # Weekends
            if 10 <= hour <= 18:  # Daytime
                return 50
            else:  # Evening/night
                return 60
    except:
        return 50

def _analyze_location_urgency(latitude: float, longitude: float) -> int:
    """Analyze location-based urgency (0-100)"""
    # Urban areas have higher urgency
    urban_areas = [
        (28.6139, 77.2090),  # Delhi
        (19.0760, 72.8777),  # Mumbai
        (12.9716, 77.5946),  # Bangalore
        (13.0827, 80.2707),  # Chennai
        (22.5726, 88.3639),  # Kolkata
    ]
    
    for city_lat, city_lon in urban_areas:
        distance = ((latitude - city_lat) ** 2 + (longitude - city_lon) ** 2) ** 0.5
        if distance < 0.5:  # Within ~50km
            return 75  # Higher urgency in urban areas
    
    return 50  # Default for rural/unknown areas

def _analyze_content_urgency(title: str, description: str) -> int:
    """Analyze content-based urgency (0-100)"""
    urgent_keywords = [
        "emergency", "urgent", "dangerous", "hazard", "accident", "injury",
        "blocked", "flooded", "broken", "damaged", "collapsed", "leaking",
        "fire", "gas", "electrical", "traffic", "pedestrian", "children"
    ]
    
    high_impact_keywords = [
        "main road", "highway", "school", "hospital", "bridge", "tunnel",
        "intersection", "crosswalk", "bus stop", "metro", "railway"
    ]
    
    content = (title + " " + (description or "")).lower()
    
    urgent_count = sum(1 for keyword in urgent_keywords if keyword in content)
    impact_count = sum(1 for keyword in high_impact_keywords if keyword in content)
    
    # Calculate content urgency score
    base_score = 50
    urgent_bonus = urgent_count * 10
    impact_bonus = impact_count * 5
    
    return min(100, base_score + urgent_bonus + impact_bonus)

def _calculate_confidence(citizen_inputs: Dict[str, Any], location_context: Dict[str, Any]) -> float:
    """Calculate confidence in the classification (0.0-1.0)"""
    confidence = 0.5  # Base confidence
    
    # Increase confidence based on data completeness
    if citizen_inputs.get("severity"):
        confidence += 0.2
    if citizen_inputs.get("duration"):
        confidence += 0.15
    if citizen_inputs.get("affected_area"):
        confidence += 0.1
    if location_context.get("latitude") and location_context.get("longitude"):
        confidence += 0.05
    
    return min(1.0, confidence)

def _generate_detailed_reasoning(category_score: int, severity_score: int, duration_score: int,
                               area_score: int, time_score: int, location_score: int,
                               content_score: int, final_score: int, urgency_label: str) -> str:
    """Generate detailed reasoning for the classification"""
    reasoning_parts = []
    
    # Factor analysis
    if category_score >= 80:
        reasoning_parts.append(f"High-priority category (score: {category_score})")
    elif category_score <= 50:
        reasoning_parts.append(f"Standard category (score: {category_score})")
    
    if severity_score >= 80:
        reasoning_parts.append(f"High severity impact (score: {severity_score})")
    elif severity_score <= 40:
        reasoning_parts.append(f"Low severity impact (score: {severity_score})")
    
    if duration_score >= 80:
        reasoning_parts.append(f"Long-standing issue (score: {duration_score})")
    elif duration_score <= 40:
        reasoning_parts.append(f"Recent issue (score: {duration_score})")
    
    if area_score >= 80:
        reasoning_parts.append(f"Wide area impact (score: {area_score})")
    elif area_score <= 40:
        reasoning_parts.append(f"Limited area impact (score: {area_score})")
    
    if time_score >= 70:
        reasoning_parts.append(f"High-impact time period (score: {time_score})")
    
    if location_score >= 70:
        reasoning_parts.append(f"Urban/high-traffic location (score: {location_score})")
    
    if content_score >= 70:
        reasoning_parts.append(f"Urgent content indicators (score: {content_score})")
    
    # Final classification
    reasoning_parts.append(f"Final weighted score: {final_score}/100 → {urgency_label}")
    
    return " | ".join(reasoning_parts)

def _generate_title(category: str, severity: str) -> str:
    """Generate appropriate title based on category and severity"""
    titles = {
        "Pothole": f"{severity} Severity Pothole Report",
        "Road Issue": f"{severity} Road Infrastructure Issue",
        "Traffic Signal": f"{severity} Traffic Signal Malfunction",
        "Waterlogging": f"{severity} Waterlogging Issue",
        "Streetlight": f"{severity} Street Lighting Problem",
        "Garbage": f"{severity} Waste Management Issue",
        "Sidewalk": f"{severity} Pedestrian Infrastructure Issue",
        "Drainage": f"{severity} Drainage System Problem",
        "Other": f"{severity} Infrastructure Issue Report"
    }
    return titles.get(category, f"{severity} Infrastructure Issue")

def _generate_description(request: SummaryRequest) -> str:
    """Generate comprehensive description"""
    from datetime import datetime
    
    try:
        report_datetime = datetime.fromisoformat(request.reporting_time.replace('Z', '+00:00'))
        formatted_date = report_datetime.strftime("%B %d, %Y")
        formatted_time = report_datetime.strftime("%I:%M %p")
    except:
        formatted_date = "Unknown Date"
        formatted_time = "Unknown Time"
    
    severity = request.mcq_responses.get("severity", "Medium")
    duration = request.mcq_responses.get("duration", "1 day")
    affected_area = request.mcq_responses.get("affectedArea", "Local area")
    
    description = f"""INFRASTRUCTURE ISSUE REPORT

ISSUE DETAILS:
Category: {request.category}
Severity: {severity}
Duration: {duration}
Area Affected: {affected_area}
Report Date: {formatted_date}
Report Time: {formatted_time}
Location: {request.latitude:.6f}, {request.longitude:.6f}
Reporter: {request.reporter_name or "Citizen"}

IMPACT ASSESSMENT:
This {severity.lower()} severity {request.category.lower()} issue has been present for {duration.lower()} and affects {affected_area.lower()}. The issue requires appropriate attention based on its severity and impact.

RECOMMENDED ACTIONS:
Based on the severity level and category, appropriate departmental action is required to address this infrastructure issue.

This report has been automatically generated and classified for administrative review."""
    
    return description

def _generate_tags(category: str, mcq_responses: Dict[str, Any]) -> list:
    """Generate relevant tags"""
    tags = [
        category.lower().replace(" ", "_"),
        mcq_responses.get("severity", "medium").lower(),
        "infrastructure",
        "citizen_report"
    ]
    
    # Add duration tag
    duration = mcq_responses.get("duration", "1 day")
    if "month" in duration.lower():
        tags.append("long_term")
    elif "week" in duration.lower():
        tags.append("medium_term")
    else:
        tags.append("short_term")
    
    # Add area impact tag
    area = mcq_responses.get("affectedArea", "Few people")
    if "entire" in area.lower():
        tags.append("wide_impact")
    elif "traffic" in area.lower():
        tags.append("traffic_impact")
    else:
        tags.append("local_impact")
    
    return tags

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
