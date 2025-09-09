# CrowdCare FastAPI Backend

A FastAPI backend for the CrowdCare issue reporting system with image upload, GPS extraction, and PostGIS integration.

## Features

- **Image Upload**: Handle multipart/form-data with image files
- **EXIF GPS Extraction**: Extract GPS coordinates from image metadata using Pillow/piexif
- **PostGIS Integration**: Store and query geographic data with PostgreSQL + PostGIS
- **Cloud Storage**: Upload images to AWS S3 or MinIO
- **RESTful API**: Clean API endpoints with proper error handling
- **Database Migrations**: Alembic for database schema management

## API Endpoints

### Reports

- `POST /reports/create` - Create a new issue report
- `GET /reports` - Get all reports (with pagination)
- `GET /reports/{report_id}` - Get a specific report

### Admin Resolution (with verification)

- `POST /admin/reports/{report_id}/resolve` - Resolve a report with geo-verified evidence and admin selfie verification

Request (multipart/form-data):

```
resolution_image: file (required) – photo of the resolved issue with EXIF GPS
admin_verification_image: file (required) – webcam selfie captured at the moment of resolution
admin_notes: string (optional)
latitude: number (optional fallback, if EXIF missing)
longitude: number (optional fallback, if EXIF missing)
```

Response:

```json
{
  "success": true,
  "message": "Report resolved successfully",
  "report_id": 45,
  "status": "resolved",
  "resolved_at": "2025-09-06T16:25:00Z",
  "evidence_url": "/uploads/2025/09/06/uuid.jpg",
  "admin_coordinates": { "lat": 22.7512, "lng": 75.8754 },
  "distance_verified": true,
  "distance_meters": 12.4,
  "admin_id": "ADM1023-UUID",
  "admin_verification_image_url": "/uploads/admin_verifications/45_ADM1023-UUID.jpg"
}
```

### Health Check

- `GET /` - API status
- `GET /health` - Health check endpoint

## Installation

1. **Install Python dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Set up environment variables:**
```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Set up PostgreSQL with PostGIS:**
```sql
-- Create database
CREATE DATABASE crowdcare;

-- Enable PostGIS extension
\c crowdcare;
CREATE EXTENSION postgis;
```

4. **Run database migrations:**
```bash
alembic upgrade head
```

5. **Start the development server:**
```bash
python run.py
```

## Environment Variables

### Database
- `DATABASE_URL` - PostgreSQL connection string

### Storage (AWS S3 / MinIO)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (default: us-east-1)
- `S3_BUCKET_NAME` - S3 bucket name
- `S3_ENDPOINT_URL` - MinIO endpoint (optional, leave empty for AWS S3)

### Server
- `PORT` - Server port (default: 8000)
- `HOST` - Server host (default: 0.0.0.0)

### OpenAI
- `OPENAI_API_KEY` - Required for face verification via OpenAI Vision

## API Usage

### Create Report

```bash
curl -X POST "http://localhost:8000/reports/create" \
  -H "Content-Type: multipart/form-data" \
  -F "title=Pothole on Main Street" \
  -F "description=Large pothole causing traffic issues" \
  -F "category=Road Issue" \
  -F "image=@/path/to/image.jpg" \
  -F "latitude=22.7512" \
  -F "longitude=75.8754"
```

**Response:**
```json
{
  "message": "Report created successfully",
  "data": {
    "id": 1,
    "title": "Pothole on Main Street",
    "latitude": 22.7512,
    "longitude": 75.8754,
    "image_url": "https://cdn.crowdcare.com/uploads/2024/01/15/abc123.jpg"
  }
}
```

### Face Verification

Endpoint:

`POST /resolve/{report_id}/verify-face`

Body (JSON):

```json
{
  "image_base64": "data:image/jpeg;base64,...",
  "report_id": 123
}
```

Response:

```json
{
  "success": true,
  "face_detected": true,
  "openai_human": true,
  "image_url": "/uploads/admin_verifications/123_ADMINUUID.jpg",
  "verified_at": "2025-09-06T16:25:00Z"
}
```

### Get Reports

```bash
curl "http://localhost:8000/reports?skip=0&limit=10"
```

## Database Schema

### Reports Table

```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    location GEOMETRY(POINT, 4326),  -- PostGIS geometry
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## GPS Extraction

The system automatically extracts GPS coordinates from image EXIF data:

1. **EXIF GPS**: Primary method - extracts from image metadata
2. **Form Parameters**: Fallback - uses provided latitude/longitude
3. **Validation**: Ensures coordinates are within valid ranges

### Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)

### GPS Coordinate Conversion

The system converts GPS coordinates from DMS (Degrees, Minutes, Seconds) format to decimal degrees:

```python
# DMS: (22, 45, 4.32) N, (75, 52, 31.44) E
# Decimal: 22.7512, 75.8754
```

## Storage Configuration

### AWS S3

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=crowdcare-uploads
```

### MinIO (Local Development)

```env
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT_URL=http://localhost:9000
S3_BUCKET_NAME=crowdcare-uploads
```

## Development

### Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

## Production Deployment

1. **Set production environment variables**
2. **Use a production ASGI server (Gunicorn + Uvicorn)**
3. **Set up proper CORS origins**
4. **Configure SSL/TLS**
5. **Set up monitoring and logging**

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

Error responses include detailed error messages:

```json
{
  "detail": "File must be an image (JPEG/PNG)"
}
```

## Security Considerations

- File type validation
- File size limits (10MB max)
- GPS coordinate validation
- Input sanitization
- CORS configuration
- Environment variable protection

## Performance

- Async/await for I/O operations
- Database connection pooling
- Image optimization
- Efficient PostGIS queries
- Cloud storage for scalability
