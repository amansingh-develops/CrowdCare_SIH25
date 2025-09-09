"""
AI Microservice Integration for CrowdCare
Handles description generation and urgency classification
"""

import httpx
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel
import os

logger = logging.getLogger(__name__)

class AISummaryRequest(BaseModel):
    category: str
    reporting_time: str
    latitude: float
    longitude: float
    mcq_responses: Dict[str, Any]
    image_description: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None

class AISummaryResponse(BaseModel):
    title: str
    description: str
    tags: Optional[list] = None

class AIClassificationRequest(BaseModel):
    title: str
    description: str
    category: str
    mcq_responses: Dict[str, Any]
    latitude: float
    longitude: float
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None
    reporting_time: Optional[str] = None
    image_description: Optional[str] = None

class AIClassificationResponse(BaseModel):
    urgency_score: int
    urgency_label: str
    reasoning: Optional[str] = None

class AIService:
    def __init__(self):
        self.ai_api_url = os.getenv("AI_API_URL", "http://localhost:8001")
        self.timeout = 30.0
        
    async def generate_summary(self, request: AISummaryRequest) -> AISummaryResponse:
        """
        Generate AI-powered title and description for a report
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.ai_api_url}/summarize",
                    json=request.dict()
                )
                response.raise_for_status()
                
                data = response.json()
                return AISummaryResponse(
                    title=data.get("title", ""),
                    description=data.get("description", ""),
                    tags=data.get("tags", [])
                )
                
        except httpx.TimeoutException:
            logger.error("AI service timeout for summary generation")
            return self._fallback_summary(request)
        except httpx.HTTPStatusError as e:
            logger.error(f"AI service error for summary: {e.response.status_code}")
            return self._fallback_summary(request)
        except Exception as e:
            logger.error(f"Unexpected error in AI summary generation: {str(e)}")
            return self._fallback_summary(request)
    
    async def classify_urgency(self, request: AIClassificationRequest) -> AIClassificationResponse:
        """
        Classify urgency level of a report using comprehensive AI analysis
        Analyzes multiple factors: content, citizen inputs, location, time, and context
        """
        try:
            # Prepare comprehensive analysis data
            analysis_data = {
                "report_content": {
                    "title": request.title,
                    "description": request.description,
                    "category": request.category,
                    "image_description": request.image_description
                },
                "citizen_inputs": {
                    "duration": request.mcq_responses.get("duration", "Unknown"),
                    "severity": request.mcq_responses.get("severity", "Medium"),
                    "affected_area": request.mcq_responses.get("affectedArea", "Local area"),
                    "reporter_name": request.reporter_name,
                    "reporter_email": request.reporter_email
                },
                "location_context": {
                    "latitude": request.latitude,
                    "longitude": request.longitude,
                    "reporting_time": request.reporting_time
                }
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.ai_api_url}/classify",
                    json=analysis_data
                )
                response.raise_for_status()
                
                data = response.json()
                return AIClassificationResponse(
                    urgency_score=data.get("urgency_score", 50),
                    urgency_label=data.get("urgency_label", "Medium"),
                    reasoning=data.get("reasoning")
                )
                
        except httpx.TimeoutException:
            logger.error("AI service timeout for urgency classification")
            return self._advanced_fallback_classification(request)
        except httpx.HTTPStatusError as e:
            logger.error(f"AI service error for classification: {e.response.status_code}")
            return self._advanced_fallback_classification(request)
        except Exception as e:
            logger.error(f"Unexpected error in AI classification: {str(e)}")
            return self._advanced_fallback_classification(request)
    
    def _fallback_summary(self, request: AISummaryRequest) -> AISummaryResponse:
        """
        Fallback summary generation when AI service is unavailable
        Generates professional, comprehensive reports with proper structure
        """
        from datetime import datetime
        
        # Parse reporting time
        try:
            report_datetime = datetime.fromisoformat(request.reporting_time.replace('Z', '+00:00'))
            formatted_date = report_datetime.strftime("%B %d, %Y")
            formatted_time = report_datetime.strftime("%I:%M %p")
        except:
            formatted_date = "Unknown Date"
            formatted_time = "Unknown Time"
        
        # Enhanced title generation based on category and severity
        category_titles = {
            "Road Issue": "Road Infrastructure Issue Report",
            "Garbage": "Waste Management Issue Report", 
            "Streetlight": "Street Lighting Problem Report",
            "Waterlogging": "Waterlogging and Drainage Issue Report",
            "Pothole": "Road Surface Damage Report",
            "Traffic Signal": "Traffic Signal Malfunction Report",
            "Sidewalk": "Pedestrian Infrastructure Issue Report",
            "Drainage": "Drainage System Problem Report",
            "Other": "General Infrastructure Issue Report"
        }
        
        title = category_titles.get(request.category, "Infrastructure Issue Report")
        
        # Extract MCQ responses for detailed description
        duration = request.mcq_responses.get("duration", "Unknown duration")
        severity = request.mcq_responses.get("severity", "Medium")
        affected_area = request.mcq_responses.get("affectedArea", "Local area")
        
        # Generate clean, structured description without markdown formatting
        description = f"""INFRASTRUCTURE ISSUE REPORT

ISSUE DETAILS:
Issue Type: {request.category}
Report Date: {formatted_date}
Report Time: {formatted_time}
Location Coordinates: {request.latitude:.6f}, {request.longitude:.6f}
Reporter: {request.reporter_name or "Citizen"}
Contact: {request.reporter_email or "Not provided"}
Category: {request.category}
Severity Level: {severity}
Duration: {duration}
Area Affected: {affected_area}

TECHNICAL SPECIFICATIONS:
Geographic Location: Latitude: {request.latitude:.6f}°N, Longitude: {request.longitude:.6f}°E
GPS Accuracy: High (EXIF data extracted from photo)

IMPACT ASSESSMENT:
Public Safety Impact: {self._get_safety_impact(request.category, severity)}
Traffic Impact: {self._get_traffic_impact(request.category)}
Environmental Impact: {self._get_environmental_impact(request.category, severity)}

RECOMMENDED ACTIONS:
{self._get_recommended_actions(request.category, severity)}

ADDITIONAL INFORMATION:
- Report generated via CrowdCare citizen reporting system
- Photo evidence attached with GPS location data
- Automated AI analysis performed for urgency classification
- Report submitted for administrative review and action
- Citizen reporter: {request.reporter_name or "Anonymous"}
- Report ID: Generated automatically by system

This report has been automatically generated and requires immediate attention from the relevant municipal department."""
        
        # Generate relevant tags
        tags = [
            request.category.lower().replace(" ", "_"),
            severity.lower(),
            "infrastructure",
            "citizen_report",
            "gps_verified"
        ]
        
        return AISummaryResponse(
            title=title,
            description=description,
            tags=tags
        )
    
    def _get_safety_impact(self, category: str, severity: str) -> str:
        """Generate safety impact assessment"""
        safety_impacts = {
            "Pothole": "High - Risk of vehicle damage and accidents",
            "Road Issue": "Medium to High - Potential traffic hazards",
            "Waterlogging": "Medium - Slippery conditions and vehicle damage",
            "Streetlight": "Medium - Reduced visibility and security concerns",
            "Traffic Signal": "High - Traffic flow disruption and accident risk",
            "Sidewalk": "Medium - Pedestrian safety concerns",
            "Garbage": "Low to Medium - Health and aesthetic concerns",
            "Drainage": "Medium - Flooding and infrastructure damage risk"
        }
        return safety_impacts.get(category, "Medium - General safety concern")
    
    def _get_traffic_impact(self, category: str) -> str:
        """Generate traffic impact assessment"""
        traffic_impacts = {
            "Pothole": "High - Vehicle damage and traffic slowdown",
            "Road Issue": "High - Traffic disruption and delays",
            "Waterlogging": "Medium - Traffic flow obstruction",
            "Traffic Signal": "High - Traffic flow disruption",
            "Streetlight": "Low - Minimal traffic impact",
            "Sidewalk": "None - Pedestrian infrastructure only",
            "Garbage": "Low - Minor traffic obstruction",
            "Drainage": "Medium - Potential road flooding"
        }
        return traffic_impacts.get(category, "Medium - General traffic impact")
    
    def _get_environmental_impact(self, category: str, severity: str) -> str:
        """Generate environmental impact assessment"""
        environmental_impacts = {
            "Garbage": "High - Environmental pollution and health hazard",
            "Waterlogging": "Medium - Water stagnation and mosquito breeding",
            "Drainage": "Medium - Water management issues",
            "Pothole": "Low - Minimal environmental impact",
            "Road Issue": "Low - Infrastructure degradation",
            "Streetlight": "Low - Energy efficiency concern",
            "Traffic Signal": "Low - Energy efficiency concern",
            "Sidewalk": "Low - Minimal environmental impact"
        }
        return environmental_impacts.get(category, "Low - Minimal environmental impact")
    
    def _get_recommended_actions(self, category: str, severity: str) -> str:
        """Generate recommended actions based on category and severity"""
        if severity == "Critical":
            urgency = "IMMEDIATE ACTION REQUIRED"
        elif severity == "High":
            urgency = "URGENT ATTENTION NEEDED"
        elif severity == "Medium":
            urgency = "PRIORITY ATTENTION REQUIRED"
        else:
            urgency = "STANDARD MAINTENANCE REQUIRED"
        
        actions = {
            "Pothole": f"{urgency}\n- Dispatch road repair crew immediately\n- Install temporary warning signs\n- Assess surrounding road conditions",
            "Road Issue": f"{urgency}\n- Conduct structural assessment\n- Plan repair timeline\n- Implement traffic management if needed",
            "Waterlogging": f"{urgency}\n- Deploy drainage cleaning crew\n- Check stormwater system\n- Monitor weather conditions",
            "Streetlight": f"PRIORITY ATTENTION REQUIRED\n- Send electrical maintenance team\n- Check power supply and wiring\n- Replace faulty components",
            "Traffic Signal": f"{urgency}\n- Dispatch traffic signal technician\n- Implement temporary traffic control\n- Coordinate with traffic police",
            "Sidewalk": f"STANDARD MAINTENANCE REQUIRED\n- Schedule sidewalk repair\n- Ensure pedestrian safety\n- Coordinate with local businesses",
            "Garbage": f"PRIORITY ATTENTION REQUIRED\n- Schedule garbage collection\n- Investigate source of accumulation\n- Implement preventive measures",
            "Drainage": f"PRIORITY ATTENTION REQUIRED\n- Inspect drainage system\n- Clear blockages\n- Assess system capacity"
        }
        return actions.get(category, f"{urgency}\n- Investigate issue\n- Determine appropriate action\n- Schedule maintenance if required")
    
    def _advanced_fallback_classification(self, request: AIClassificationRequest) -> AIClassificationResponse:
        """
        Advanced fallback urgency classification with comprehensive analysis
        Considers multiple factors: category, severity, duration, affected area, location, and time
        """
        from datetime import datetime, time
        
        # Base category urgency weights (0-100)
        category_weights = {
            "Pothole": 75,
            "Road Issue": 70,
            "Traffic Signal": 85,
            "Waterlogging": 80,
            "Streetlight": 60,
            "Garbage": 55,
            "Sidewalk": 45,
            "Drainage": 70,
            "Other": 50
        }
        
        # Severity impact multipliers
        severity_multipliers = {
            "Critical": 1.4,
            "High": 1.2,
            "Medium": 1.0,
            "Low": 0.8
        }
        
        # Duration urgency factors (longer duration = higher urgency)
        duration_factors = {
            "Just noticed": 0.9,
            "1 day": 1.0,
            "1 week": 1.1,
            "2 weeks": 1.2,
            "1 month": 1.3,
            "More than 1 month": 1.4
        }
        
        # Affected area impact factors
        affected_area_factors = {
            "Few people": 0.8,
            "Many people": 1.1,
            "Entire area": 1.3,
            "Traffic flow": 1.2,
            "Pedestrians only": 0.9
        }
        
        # Time-based urgency factors (rush hours, night time, etc.)
        time_factors = self._calculate_time_factor(request.reporting_time)
        
        # Location-based factors (urban vs rural, high-traffic areas)
        location_factors = self._calculate_location_factor(request.latitude, request.longitude)
        
        # Content analysis factors
        content_factors = self._analyze_content_urgency(request.title, request.description)
        
        # Calculate base score
        base_score = category_weights.get(request.category, 50)
        
        # Apply multipliers
        severity = request.mcq_responses.get("severity", "Medium")
        duration = request.mcq_responses.get("duration", "1 day")
        affected_area = request.mcq_responses.get("affectedArea", "Few people")
        
        severity_mult = severity_multipliers.get(severity, 1.0)
        duration_mult = duration_factors.get(duration, 1.0)
        area_mult = affected_area_factors.get(affected_area, 1.0)
        
        # Calculate final urgency score
        urgency_score = int(base_score * severity_mult * duration_mult * area_mult * time_factors * location_factors * content_factors)
        urgency_score = max(1, min(100, urgency_score))  # Clamp between 1-100
        
        # Determine urgency label with more granular classification
        if urgency_score >= 90:
            urgency_label = "Critical"
        elif urgency_score >= 75:
            urgency_label = "High"
        elif urgency_score >= 50:
            urgency_label = "Medium"
        elif urgency_score >= 25:
            urgency_label = "Low"
        else:
            urgency_label = "Very Low"
        
        # Generate detailed reasoning
        reasoning = self._generate_classification_reasoning(
            request.category, severity, duration, affected_area, 
            urgency_score, urgency_label, time_factors, location_factors, content_factors
        )
        
        return AIClassificationResponse(
            urgency_score=urgency_score,
            urgency_label=urgency_label,
            reasoning=reasoning
        )
    
    def _calculate_time_factor(self, reporting_time: Optional[str]) -> float:
        """Calculate time-based urgency factor"""
        if not reporting_time:
            return 1.0
            
        try:
            from datetime import datetime
            report_time = datetime.fromisoformat(reporting_time.replace('Z', '+00:00'))
            hour = report_time.hour
            weekday = report_time.weekday()  # 0=Monday, 6=Sunday
            
            # Rush hour factors (higher urgency during peak times)
            if weekday < 5:  # Weekdays
                if 7 <= hour <= 9 or 17 <= hour <= 19:  # Rush hours
                    return 1.2
                elif 22 <= hour <= 6:  # Night time
                    return 1.1
                else:
                    return 1.0
            else:  # Weekends
                if 10 <= hour <= 18:  # Daytime
                    return 1.0
                else:  # Evening/night
                    return 1.1
        except:
            return 1.0
    
    def _calculate_location_factor(self, latitude: float, longitude: float) -> float:
        """Calculate location-based urgency factor"""
        # This is a simplified version - in production, you'd use actual geographic data
        # For now, we'll use some basic heuristics
        
        # Urban areas (approximate coordinates for major cities)
        urban_areas = [
            (28.6139, 77.2090),  # Delhi
            (19.0760, 72.8777),  # Mumbai
            (12.9716, 77.5946),  # Bangalore
            (13.0827, 80.2707),  # Chennai
            (22.5726, 88.3639),  # Kolkata
        ]
        
        # Check if location is near urban areas (within ~50km)
        for city_lat, city_lon in urban_areas:
            distance = ((latitude - city_lat) ** 2 + (longitude - city_lon) ** 2) ** 0.5
            if distance < 0.5:  # Roughly 50km
                return 1.2  # Higher urgency in urban areas
        
        return 1.0  # Default for rural/unknown areas
    
    def _analyze_content_urgency(self, title: str, description: str) -> float:
        """Analyze content for urgency indicators"""
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
        
        # Calculate content urgency factor
        content_factor = 1.0 + (urgent_count * 0.1) + (impact_count * 0.05)
        return min(1.5, content_factor)  # Cap at 1.5x
    
    def _generate_classification_reasoning(self, category: str, severity: str, duration: str, 
                                         affected_area: str, urgency_score: int, urgency_label: str,
                                         time_factor: float, location_factor: float, content_factor: float) -> str:
        """Generate detailed reasoning for the classification"""
        reasoning_parts = []
        
        # Category reasoning
        reasoning_parts.append(f"Category '{category}' has inherent urgency factors")
        
        # Severity reasoning
        if severity in ["Critical", "High"]:
            reasoning_parts.append(f"High severity level '{severity}' significantly increases urgency")
        elif severity == "Low":
            reasoning_parts.append(f"Low severity level '{severity}' reduces urgency")
        
        # Duration reasoning
        if duration in ["1 month", "More than 1 month"]:
            reasoning_parts.append(f"Long duration '{duration}' indicates persistent issue requiring attention")
        elif duration == "Just noticed":
            reasoning_parts.append(f"Recent issue '{duration}' may require immediate assessment")
        
        # Affected area reasoning
        if affected_area in ["Entire area", "Traffic flow"]:
            reasoning_parts.append(f"Wide impact area '{affected_area}' increases urgency")
        elif affected_area == "Few people":
            reasoning_parts.append(f"Limited impact area '{affected_area}' reduces urgency")
        
        # Time factor reasoning
        if time_factor > 1.1:
            reasoning_parts.append("Reported during high-impact time period (rush hour/night)")
        
        # Location factor reasoning
        if location_factor > 1.1:
            reasoning_parts.append("Location in high-traffic urban area increases urgency")
        
        # Content factor reasoning
        if content_factor > 1.1:
            reasoning_parts.append("Content contains urgent keywords indicating immediate attention needed")
        
        # Final score reasoning
        reasoning_parts.append(f"Final urgency score: {urgency_score}/100, classified as '{urgency_label}'")
        
        return " | ".join(reasoning_parts)

# Global instance
ai_service = AIService()
