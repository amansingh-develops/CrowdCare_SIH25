# CrowdCare - Complete Civic Issue Reporting System

A full-stack application for reporting and managing civic issues with AI-powered description generation and urgency classification.

## 🚀 Features

### Frontend (React + TypeScript + Tailwind)
- **Role-based Authentication**: Separate flows for citizens and administrators
- **Smart Report Form**: Image upload with EXIF GPS extraction and browser geolocation fallback
- **AI-Enhanced Reporting**: MCQ-based form for improved AI description generation
- **Interactive Maps**: React Leaflet integration for location preview
- **Responsive Design**: Mobile-first PWA with modern UI components
- **Real-time Updates**: Toast notifications and status tracking

### Backend (FastAPI + PostgreSQL + PostGIS)
- **JWT Authentication**: Secure token-based auth with refresh tokens
- **EXIF GPS Extraction**: Automatic location detection from image metadata
- **AI Integration**: Microservice for description generation and urgency classification
- **PostGIS Support**: Geographic data storage and spatial queries
- **File Storage**: AWS S3/MinIO integration for image uploads
- **RESTful API**: Comprehensive API with proper error handling

### AI Features
- **Smart Summarization**: AI-generated titles and descriptions based on context
- **Urgency Classification**: Automatic priority scoring (Low, Medium, High, Critical)
- **Fallback Systems**: Rule-based generation when AI service is unavailable
- **Context Awareness**: Uses category, location, and user responses for better results

## 📁 Project Structure

```
CrowdCareMonorepo/
├── client/                          # React Frontend
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── ui/                  # Radix UI components
│   │   │   ├── ReportForm.tsx       # Main report submission form
│   │   │   ├── IssueCard.tsx        # Issue display component
│   │   │   └── ...
│   │   ├── pages/                   # Page components
│   │   │   ├── LandingPage.tsx      # Role selection landing
│   │   │   ├── CitizenAuth.tsx      # Citizen registration/login
│   │   │   ├── AdminAuth.tsx        # Admin registration/login
│   │   │   ├── CitizenDashboard.tsx # Citizen dashboard
│   │   │   ├── AdminDashboard.tsx   # Admin dashboard with urgency ranking
│   │   │   └── ...
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/                     # Utilities and configurations
│   │   └── types/                   # TypeScript type definitions
│   └── package.json
├── backend/                         # FastAPI Backend
│   ├── services/                    # Business logic services
│   │   ├── ai_service.py           # AI microservice integration
│   │   ├── auth_service.py         # Authentication logic
│   │   ├── exif_service.py         # EXIF GPS extraction
│   │   ├── storage_service.py      # File storage (S3/MinIO)
│   │   └── report_service.py       # Report management
│   ├── routes/                      # API route handlers
│   │   └── auth.py                 # Authentication endpoints
│   ├── models.py                    # SQLAlchemy database models
│   ├── schemas.py                   # Pydantic request/response schemas
│   ├── database.py                  # Database configuration
│   ├── main.py                      # FastAPI application
│   └── requirements.txt
├── shared/                          # Shared schemas and types
└── README files and documentation
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- PostgreSQL 13+ with PostGIS extension
- AWS S3 account or MinIO for file storage

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Set up database:**
   ```sql
   CREATE DATABASE crowdcare_db;
   \c crowdcare_db;
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

6. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

7. **Start the server:**
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to client directory:**
   ```bash
   cd client
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Set up environment variables:**
   ```bash
   # Create .env file in client directory
   echo "VITE_API_URL=http://localhost:8000" > .env
   echo "VITE_AI_API_URL=http://localhost:8001" >> .env
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/crowdcare
POSTGRES_USER=crowdcare_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=crowdcare_db

# JWT
JWT_SECRET_KEY=your-super-secret-jwt-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Storage
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=crowdcare-uploads

# AI Service
AI_API_URL=http://localhost:8001

# Server
PORT=8000
DEBUG=True
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
VITE_AI_API_URL=http://localhost:8001
```

## 📱 Usage

### For Citizens

1. **Access the application** at `http://localhost:3000`
2. **Select "Citizen Login/Register"** on the landing page
3. **Register** with your details (name, email, mobile, password)
4. **Login** to access the citizen dashboard
5. **Report an Issue**:
   - Select category (Pothole, Garbage, Streetlight, etc.)
   - Upload image (GPS will be auto-extracted from EXIF)
   - Fill optional MCQs (duration, severity, affected people)
   - Click "Generate Description" for AI enhancement
   - Submit the report

### For Administrators

1. **Select "Admin Login/Register"** on the landing page
2. **Register** with admin credentials (including Admin ID and department)
3. **Login** to access the admin dashboard
4. **View Reports** sorted by urgency (Critical → High → Medium → Low)
5. **Filter reports** by urgency level or status
6. **Manage issues** with status updates and notes

## 🔌 API Endpoints

### Authentication
- `POST /auth/citizen/register` - Register citizen
- `POST /auth/admin/register` - Register admin
- `POST /auth/citizen/login` - Citizen login
- `POST /auth/admin/login` - Admin login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user info

### Reports
- `POST /reports/create` - Create new report (with AI enhancement)
- `GET /admin/reports` - Get all reports (admin only, with urgency ranking)
- `GET /reports/{id}` - Get specific report
- `GET /reports` - Get all reports (paginated)

### Utility
- `GET /health` - Health check

## 🤖 AI Integration

The system integrates with an AI microservice for:

### Description Generation (`/summarize`)
**Input:**
- Category, GPS coordinates, reporting time
- MCQ responses (duration, severity, affected people)
- Optional image description

**Output:**
- AI-generated title
- Enhanced description
- Relevant tags

### Urgency Classification (`/classify`)
**Input:**
- Title, description, category
- MCQ responses and location data

**Output:**
- Urgency score (0-100)
- Urgency label (Low, Medium, High, Critical)
- Reasoning for classification

### Fallback System
When AI service is unavailable, the system uses rule-based generation:
- Category-based title templates
- Severity-weighted urgency scoring
- Basic description formatting

## 🗄️ Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (Unique)
- `password_hash`
- `full_name`
- `mobile_number`
- `role` (citizen/admin)
- `admin_id` (for admins)
- `municipality_name` (for admins)
- `department_name` (for admins)
- `is_active`, `is_verified`
- `created_at`, `updated_at`

### Reports Table
- `id` (UUID, Primary Key)
- `title`, `description`, `category`
- `image_url`
- `latitude`, `longitude`
- `location` (PostGIS Point)
- `ai_generated_title`, `ai_generated_description`
- `ai_tags` (JSON)
- `urgency_score`, `urgency_label`
- `mcq_responses` (JSON)
- `reporter_id` (Foreign Key)
- `status` (pending/in_progress/resolved)
- `admin_notes`
- `created_at`, `updated_at`

### Refresh Tokens Table
- `id` (UUID, Primary Key)
- `user_id` (Foreign Key)
- `token` (Unique)
- `expires_at`
- `created_at`

## 🧪 Testing

### Backend Testing
```bash
cd backend
python -m pytest tests/
```

### Frontend Testing
```bash
cd client
npm test
```

### API Testing
Use the provided curl examples in `backend/API_EXAMPLES.md` or import the OpenAPI spec into Postman.

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Production Considerations
- Use environment-specific configurations
- Set up proper SSL certificates
- Configure CORS for production domains
- Use production database and storage
- Set up monitoring and logging
- Implement rate limiting
- Configure backup strategies

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **Password Hashing** using bcrypt
- **Role-based Access Control** (RBAC)
- **Input Validation** with Pydantic schemas
- **CORS Configuration** for cross-origin requests
- **File Upload Validation** (type, size limits)
- **SQL Injection Protection** via SQLAlchemy ORM

## 📊 Monitoring & Analytics

- **Health Check Endpoint** for service monitoring
- **Structured Logging** with different levels
- **Error Tracking** with detailed error responses
- **Performance Metrics** for API endpoints
- **User Activity Tracking** (optional)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the API documentation at `/docs` when the server is running
- Review the example curl commands in `backend/API_EXAMPLES.md`
- Check the troubleshooting section in the README files

## 🎯 Roadmap

- [ ] Real-time notifications
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Integration with municipal systems
- [ ] Machine learning model improvements
- [ ] Automated issue resolution workflows
