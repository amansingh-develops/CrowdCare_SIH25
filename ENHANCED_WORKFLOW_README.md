# CrowdCare Enhanced Workflow Implementation

## Overview

This document describes the enhanced CrowdCare system with **geo-verified evidence uploads**, **status tracking**, and **real-time updates** for both admin and citizen dashboards.

## 🚀 New Features

### 1. Admin Issue Resolution Workflow

#### Geo-Verified Evidence Upload
- **Mandatory Evidence Upload**: Admins must upload a geo-tagged photo when marking issues as "Resolved"
- **EXIF GPS Extraction**: Automatically extracts GPS coordinates from uploaded photos
- **Coordinate Verification**: Compares evidence coordinates with original report coordinates
- **30-Meter Radius Validation**: Evidence must be within ±30 meters of the original location
- **Error Handling**: Clear error messages when verification fails

#### Enhanced Status Management
- **Status Stages**: `reported` → `acknowledged` → `in_progress` → `resolved`
- **Timestamp Tracking**: Each status change is recorded with exact timestamps
- **Status History**: Complete audit trail of all status changes
- **Admin Notes**: Optional notes for each status update

### 2. Real-Time Citizen Status Tracking

#### Progress Tracking UI
- **Status Timeline**: Visual progress bar showing completion percentage
- **Stage Indicators**: Clear icons and colors for each status stage
- **Timestamp Display**: Shows when each stage was completed
- **Auto-Refresh**: Updates every 30 seconds for real-time information

#### Evidence Display
- **Resolution Photos**: Citizens can view evidence photos when issues are resolved
- **Location Verification**: Shows that the resolution was geo-verified
- **Distance Information**: Displays how close the evidence was to the original location

## 🏗️ Technical Implementation

### Backend Enhancements

#### New Database Models
```python
# Enhanced Report model with status tracking
class Report(Base):
    # ... existing fields ...
    status = Column(String(20), default="reported")
    status_history = Column(Text)  # JSON string of status changes
    reported_at = Column(DateTime(timezone=True))
    acknowledged_at = Column(DateTime(timezone=True))
    in_progress_at = Column(DateTime(timezone=True))

# New status history tracking
class ReportStatusHistory(Base):
    id = Column(Integer, primary_key=True)
    report_id = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False)
    changed_by = Column(String(36))
    changed_at = Column(DateTime(timezone=True))
    notes = Column(Text)
```

#### New Services
- **StatusService**: Handles status updates and history tracking
- **Enhanced ResolutionService**: Updated with 30m radius validation
- **EXIF Service**: Already implemented for GPS extraction

#### New API Endpoints
```
PATCH /admin/reports/{id}/status          # Update report status
GET  /reports/{id}/status-history         # Get status history
GET  /reports/{id}/status-timeline        # Get complete timeline
POST /admin/reports/{id}/resolve          # Enhanced resolution with geo-verification
```

### Frontend Enhancements

#### New Components
- **EvidenceUploadModal**: Modal for admin evidence upload with GPS verification
- **StatusTracker**: Real-time status tracking component for citizens
- **Enhanced AdminPanel**: Integrated evidence upload workflow
- **Enhanced CitizenPanel**: Added status tracking functionality

#### Updated Types
```typescript
interface StatusTimeline {
  report_id: number;
  current_status: string;
  stages: {
    reported: { status: 'completed' | 'pending'; timestamp?: string; notes: string };
    acknowledged: { status: 'completed' | 'pending'; timestamp?: string; notes: string };
    in_progress: { status: 'completed' | 'pending'; timestamp?: string; notes: string };
    resolved: { status: 'completed' | 'pending'; timestamp?: string; notes: string };
  };
  history: StatusHistoryEntry[];
}
```

## 📋 Workflow Examples

### Admin Resolution Workflow

1. **Admin views issue** in dashboard
2. **Updates status** to "acknowledged" or "in_progress"
3. **When ready to resolve**:
   - Clicks "Resolve" button
   - Evidence upload modal opens
   - Uploads geo-tagged photo
   - System verifies GPS coordinates
   - If within 30m radius: Resolution approved
   - If outside radius: Error message displayed
4. **Issue marked as resolved** with evidence stored

### Citizen Tracking Workflow

1. **Citizen reports issue** (existing workflow)
2. **Views status tracking** on dashboard
3. **Real-time updates** show progress:
   - "Reported" → "Acknowledged" → "In Progress" → "Resolved"
4. **When resolved**:
   - Can view evidence photo
   - See resolution timestamp
   - Verify geo-verification was performed

## 🔧 Configuration

### Environment Variables
```bash
# Backend configuration
MAX_RESOLUTION_DISTANCE_METERS=30  # Default: 30 meters
STATUS_UPDATE_INTERVAL_SECONDS=30  # Default: 30 seconds
```

### Database Migration
Run the migration script to add new columns:
```bash
cd backend
python migrate_status_tracking.py
```

## 🧪 Testing

### Test Script
Run the comprehensive test script:
```bash
python test_enhanced_workflow.py
```

### Test Coverage
- ✅ User registration and authentication
- ✅ Report creation with GPS coordinates
- ✅ Status updates with tracking
- ✅ Geo-verified evidence upload
- ✅ Coordinate validation (30m radius)
- ✅ Real-time status timeline
- ✅ Citizen status tracking
- ✅ Error handling for invalid coordinates

## 📊 API Examples

### Update Report Status
```bash
curl -X PATCH "http://localhost:8000/admin/reports/123/status" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "acknowledged",
    "notes": "Issue acknowledged by admin"
  }'
```

### Resolve Report with Evidence
```bash
curl -X POST "http://localhost:8000/admin/reports/123/resolve" \
  -H "Authorization: Bearer <admin_token>" \
  -F "resolution_image=@evidence.jpg" \
  -F "admin_notes=Issue resolved with geo-verified evidence" \
  -F "latitude=40.7129" \
  -F "longitude=-74.0061"
```

### Get Status Timeline
```bash
curl -X GET "http://localhost:8000/reports/123/status-timeline" \
  -H "Authorization: Bearer <citizen_token>"
```

## 🎯 Acceptance Criteria

### ✅ Admin Requirements
- [x] Admin cannot mark issue as "Resolved" without uploading geo-tagged evidence
- [x] Evidence coordinates must be within ±30 meters of reporter's original coordinates
- [x] Clear error message when verification fails
- [x] Evidence photo and coordinates stored with resolution

### ✅ Citizen Requirements
- [x] Real-time status tracking with progress bar
- [x] All status stages with timestamps
- [x] Evidence photo display when resolved
- [x] Auto-refresh every 30 seconds

### ✅ Technical Requirements
- [x] EXIF GPS extraction from uploaded images
- [x] Haversine formula for distance calculation
- [x] Status history tracking with audit trail
- [x] Real-time updates using polling
- [x] Error handling and validation

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   pip install -r requirements.txt
   
   # Frontend
   cd client
   npm install
   ```

2. **Run Database Migration**
   ```bash
   cd backend
   python migrate_status_tracking.py
   ```

3. **Start Services**
   ```bash
   # Backend
   cd backend
   python main.py
   
   # Frontend
   cd client
   npm run dev
   ```

4. **Test the Workflow**
   ```bash
   python test_enhanced_workflow.py
   ```

## 📝 Notes

- The system uses a 30-meter radius for coordinate verification as specified
- Real-time updates are implemented using 30-second polling intervals
- EXIF GPS extraction works with JPEG and PNG images
- Status history is stored both in JSON format and separate history table
- All timestamps are stored in UTC with timezone information

## 🔮 Future Enhancements

- WebSocket implementation for true real-time updates
- Push notifications for status changes
- Advanced GPS validation with accuracy metrics
- Bulk status updates for admins
- Status change notifications via email/SMS
