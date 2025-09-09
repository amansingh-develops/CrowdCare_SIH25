# CrowdCare API Examples

This document provides example curl commands and environment variables for testing the CrowdCare API.

## Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/crowdcare
POSTGRES_USER=crowdcare_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=crowdcare_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Storage Configuration (AWS S3 or MinIO)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=crowdcare-uploads
S3_ENDPOINT_URL=https://s3.amazonaws.com  # For MinIO, use: http://localhost:9000

# AI Microservice Configuration
AI_API_URL=http://localhost:8001

# Server Configuration
PORT=8000
DEBUG=True
```

## API Endpoints Examples

### 1. User Registration

#### Citizen Registration
```bash
curl -X POST "http://localhost:8000/auth/citizen/register" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "mobile_number": "+1234567890",
    "password": "securepassword123",
    "confirm_password": "securepassword123"
  }'
```

#### Admin Registration
```bash
curl -X POST "http://localhost:8000/auth/admin/register" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Admin User",
    "email": "admin@municipality.gov",
    "mobile_number": "+1234567890",
    "password": "adminpassword123",
    "confirm_password": "adminpassword123",
    "admin_id": "ADMIN001",
    "municipality_name": "Springfield Municipality",
    "department_name": "Public Works"
  }'
```

### 2. User Login

#### Citizen Login
```bash
curl -X POST "http://localhost:8000/auth/citizen/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "securepassword123"
  }'
```

#### Admin Login
```bash
curl -X POST "http://localhost:8000/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@municipality.gov",
    "password": "adminpassword123"
  }'
```

**Response Example:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "john.doe@example.com",
    "full_name": "John Doe",
    "mobile_number": "+1234567890",
    "role": "citizen",
    "is_active": true,
    "is_verified": false,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Create Report with AI Enhancement

```bash
curl -X POST "http://localhost:8000/reports/create" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "title=Road Issue Report" \
  -F "description=There is a large pothole on Main Street" \
  -F "category=Pothole" \
  -F "latitude=40.7128" \
  -F "longitude=-74.0060" \
  -F "mcq_responses={\"duration\":\"1 week\",\"severity\":\"High\",\"affected_people\":\"Many\"}" \
  -F "image=@/path/to/your/image.jpg"
```

**Response Example:**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "title": "Critical Pothole on Main Street",
  "description": "Large pothole has been present for 1 week on Main Street, affecting many commuters. High severity issue requiring immediate attention.",
  "category": "Pothole",
  "image_url": "https://s3.amazonaws.com/crowdcare-uploads/reports/456e7890-e89b-12d3-a456-426614174001.jpg",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "ai_generated_title": "Critical Pothole on Main Street",
  "ai_generated_description": "Large pothole has been present for 1 week on Main Street, affecting many commuters. High severity issue requiring immediate attention.",
  "ai_tags": "[\"pothole\", \"main_street\", \"high_priority\"]",
  "urgency_score": 85,
  "urgency_label": "High",
  "mcq_responses": "{\"duration\":\"1 week\",\"severity\":\"High\",\"affected_people\":\"Many\"}",
  "reporter_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "admin_notes": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### 4. Get Admin Reports (with Urgency Ranking)

```bash
curl -X GET "http://localhost:8000/admin/reports" \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"
```

#### Filter by Urgency
```bash
curl -X GET "http://localhost:8000/admin/reports?urgency_filter=High" \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"
```

#### Filter by Status
```bash
curl -X GET "http://localhost:8000/admin/reports?status_filter=pending" \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"
```

**Response Example:**
```json
[
  {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "title": "Critical Pothole on Main Street",
    "category": "Pothole",
    "description": "Large pothole has been present for 1 week on Main Street, affecting many commuters.",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "urgency_score": 85,
    "urgency_label": "High",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00Z",
    "image_url": "https://s3.amazonaws.com/crowdcare-uploads/reports/456e7890-e89b-12d3-a456-426614174001.jpg",
    "ai_generated_title": "Critical Pothole on Main Street",
    "ai_generated_description": "Large pothole has been present for 1 week on Main Street, affecting many commuters.",
    "mcq_responses": "{\"duration\":\"1 week\",\"severity\":\"High\",\"affected_people\":\"Many\"}"
  }
]
```

### 5. Token Management

#### Refresh Access Token
```bash
curl -X POST "http://localhost:8000/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

#### Logout
```bash
curl -X POST "http://localhost:8000/auth/logout" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

#### Get Current User Info
```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6. Health Check

```bash
curl -X GET "http://localhost:8000/health"
```

**Response:**
```json
{
  "status": "healthy",
  "message": "CrowdCare API v2.0 is running"
}
```

## Frontend Environment Variables

Create a `.env` file in the `client/` directory:

```env
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_AI_API_URL=http://localhost:8001

# Map Configuration (if using maps)
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

## Testing the Complete Flow

1. **Start the backend server:**
   ```bash
   cd backend
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Register a citizen user** using the citizen registration endpoint

3. **Login as citizen** and save the access token

4. **Create a report** with image upload and MCQ responses

5. **Register an admin user** using the admin registration endpoint

6. **Login as admin** and save the admin access token

7. **View reports** using the admin reports endpoint to see urgency ranking

## AI Microservice Integration

The API integrates with an AI microservice for:
- **Description Generation**: `/summarize` endpoint
- **Urgency Classification**: `/classify` endpoint

If the AI service is unavailable, the system falls back to basic rule-based generation.

## Database Setup

Make sure PostgreSQL with PostGIS extension is running:

```sql
-- Create database
CREATE DATABASE crowdcare_db;

-- Connect to database and enable PostGIS
\c crowdcare_db;
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Storage Setup

For AWS S3:
- Create an S3 bucket
- Configure IAM user with appropriate permissions
- Set environment variables

For MinIO (local development):
```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```
