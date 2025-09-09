# CrowdCare Department-Based Admin System

## 🎯 Overview

The CrowdCare system now supports a department-based admin structure where:
- **Admins are assigned to specific departments** (e.g., Garbage, Roads, Water, etc.)
- **Issues are automatically categorized** and routed to the appropriate department
- **Admins see department-specific issues** in their "My Department Issues" panel
- **Other department issues** are shown separately for cross-department awareness
- **Report resolution requires photo verification** from the same location with coordinate matching

## 🏗️ System Architecture

### Departments
- **Garbage**: Waste management and sanitation
- **Roads**: Road infrastructure and maintenance  
- **Water**: Water supply and drainage
- **Electricity**: Power infrastructure and street lighting
- **Traffic**: Traffic signals and road safety
- **Parks**: Public parks and recreation areas
- **General**: General municipal services

### Category-Department Mappings
- **Garbage** → Garbage, Waste, Sanitation
- **Roads** → Pothole, Road Damage, Sidewalk, Drainage
- **Water** → Waterlogging, Water Supply
- **Electricity** → Streetlight, Power Outage
- **Traffic** → Traffic Signal, Road Safety
- **Parks** → Park Maintenance, Recreation
- **General** → Other (catch-all)

## 🚀 Setup Instructions

### 1. Initialize the System
```bash
cd backend
python init_departments.py
```

This will:
- Create the new database tables
- Initialize default departments
- Set up category-department mappings

### 2. Create Admin Users
```bash
cd backend
python create_admin.py
```

Follow the prompts to:
- Enter admin email and password
- Select department assignment
- Set admin details

### 3. Start the Server
```bash
cd backend
python run.py
```

## 📱 New API Endpoints

### Department Management
- `GET /admin/departments/initialize` - Initialize departments
- `GET /admin/departments/my-issues` - Get issues for admin's department
- `GET /admin/departments/other-issues` - Get issues from other departments
- `GET /admin/departments/stats` - Get department statistics

### Report Resolution
- `POST /admin/reports/{report_id}/resolve` - Resolve a report with photo verification
- `GET /admin/reports/{report_id}/resolution` - Get resolution details

## 🔍 How It Works

### 1. Issue Categorization
When a citizen submits a report:
1. **Category is extracted** from the form
2. **Department is automatically determined** based on category mapping
3. **Report is stored** with category and coordinates

### 2. Admin Dashboard Views
- **"My Department Issues"**: Shows issues from admin's assigned department
- **"Other Department Issues"**: Shows issues from other departments
- **Filtering**: By status (pending, in_progress, resolved) and urgency (Low, Medium, High)

### 3. Report Resolution Process
When an admin marks a report as resolved:

1. **Upload Resolution Photo**: Must include a photo of the resolved issue
2. **Coordinate Verification**: System extracts GPS coordinates from the photo
3. **Location Validation**: Coordinates must be within 50 meters of original issue
4. **Resolution Recording**: Updates report status and stores resolution details

### 4. Coordinate Verification
- **Haversine Formula**: Calculates distance between original and resolution coordinates
- **50-Meter Radius**: Maximum allowed distance for verification
- **EXIF Extraction**: Automatically extracts GPS from resolution photos
- **Fallback Support**: Manual coordinate input if EXIF not available

## 🎨 Frontend Integration

### Admin Panel Updates
The admin dashboard now shows:
- **Department Assignment**: Clear indication of admin's department
- **Issue Tabs**: Separate views for department vs. other issues
- **Resolution Form**: Photo upload with coordinate verification
- **Statistics**: Department-specific metrics and counts

### Citizen Experience
- **Same submission process**: No changes to citizen workflow
- **Automatic routing**: Issues automatically go to correct department
- **Status tracking**: Can see when issues are assigned and resolved

## 🔧 Technical Details

### Database Schema Updates
- **Report table**: Added resolution tracking fields
- **New tables**: Department categories and category mappings
- **User table**: Enhanced with department assignment

### Services
- **DepartmentService**: Manages departments and category mappings
- **ResolutionService**: Handles report resolution with coordinate verification
- **Enhanced AI Service**: Better integration with department system

### Security Features
- **Admin-only endpoints**: Department management requires admin authentication
- **Department isolation**: Admins can only see their department's issues
- **Coordinate verification**: Prevents false resolution claims

## 🧪 Testing

### Test Report Submission
1. Submit a report with category "Garbage"
2. Verify it appears in Garbage department admin panel
3. Check it doesn't appear in Roads department admin panel

### Test Resolution
1. Login as Garbage department admin
2. Attempt to resolve a Garbage issue
3. Upload photo from same location
4. Verify coordinate verification works
5. Check resolution is recorded

### Test Cross-Department
1. Login as Garbage admin
2. Verify you can see Roads issues in "Other Department Issues"
3. Verify you cannot resolve Roads issues

## 🚨 Troubleshooting

### Common Issues

1. **"Admin not assigned to any department"**
   - Run `create_admin.py` to assign department
   - Check user role is "admin"

2. **"Department not found"**
   - Run `init_departments.py` first
   - Check database connection

3. **"Resolution location too far"**
   - Ensure photo is taken from same location
   - Check GPS is enabled on device
   - Verify coordinates are accurate

4. **"No reports showing"**
   - Check if reports exist in database
   - Verify category-department mappings
   - Check admin's department assignment

### Debug Commands
```bash
# Check database tables
cd backend
python -c "from database import engine; from models import Base; Base.metadata.create_all(engine); print('Tables created')"

# Check departments
python -c "from database import get_db; from models import DepartmentCategory; db = next(get_db()); depts = db.query(DepartmentCategory).all(); print([d.name for d in depts])"

# Check mappings
python -c "from database import get_db; from models import CategoryDepartmentMapping; db = next(get_db()); maps = db.query(CategoryDepartmentMapping).all(); print([f'{m.category}->{m.department_name}' for m in maps])"
```

## 🎯 Next Steps

1. **Test the system** with sample data
2. **Customize departments** based on your municipality's needs
3. **Add more categories** and mappings as required
4. **Implement notifications** for new issues
5. **Add reporting** and analytics features

## 📞 Support

For technical issues or questions about the department system, check:
- Backend logs for error messages
- Database schema for table structure
- API responses for endpoint behavior
- Coordinate verification for location issues
