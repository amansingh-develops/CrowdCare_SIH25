# ReportForm Component

A comprehensive React component for capturing issue reports with photo upload, GPS location detection, and map preview functionality.

## Features

- **Photo Capture**: Camera-enabled file input with image preview
- **EXIF GPS Extraction**: Automatically extracts GPS coordinates from photo metadata
- **Fallback Geolocation**: Uses browser GPS if EXIF data is unavailable
- **Interactive Map**: React Leaflet integration for location preview
- **Form Validation**: Comprehensive validation using react-hook-form and Zod
- **Toast Notifications**: Success/error feedback using Radix UI toast
- **Responsive Design**: Mobile-first design with Tailwind CSS

## Dependencies

The following packages are required and have been added to `package.json`:

```json
{
  "exifr": "^7.1.3",
  "axios": "^1.7.9", 
  "react-leaflet": "^4.2.1",
  "leaflet": "^1.9.4"
}
```

## Installation

1. Install the dependencies:
```bash
npm install
```

2. The Leaflet CSS has been added to `client/src/index.css`:
```css
@import 'leaflet/dist/leaflet.css';
```

## Usage

### Basic Usage

```tsx
import ReportForm from '@/components/ReportForm';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <div>
      <ReportForm />
      <Toaster />
    </div>
  );
}
```

### With Custom Styling

```tsx
import ReportForm from '@/components/ReportForm';

function CustomReportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <ReportForm />
      </div>
    </div>
  );
}
```

## Form Fields

- **Title**: Short text input (required, max 100 characters)
- **Description**: Textarea (required, max 500 characters)  
- **Category**: Dropdown with predefined options
- **Image**: File input with camera capture enabled
- **Location**: Auto-detected from EXIF or browser GPS

## Location Detection Flow

1. **EXIF GPS**: First attempts to extract GPS coordinates from uploaded image
2. **Browser Geolocation**: Falls back to `navigator.geolocation` if EXIF fails
3. **Manual Detection**: "Detect My Location" button for manual GPS retrieval
4. **Map Preview**: Optional map view showing detected coordinates

## API Integration

The component submits to `/api/reports/create` with `multipart/form-data`:

```typescript
const formData = new FormData();
formData.append('title', data.title);
formData.append('description', data.description);
formData.append('category', data.category);
formData.append('image', data.image[0]);
formData.append('latitude', data.latitude.toString());
formData.append('longitude', data.longitude.toString());
```

## Environment Variables

Create a `.env` file with:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000
API_BASE_URL=http://localhost:5000

# Map Configuration
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_MAP_ATTRIBUTION='&copy; OpenStreetMap contributors'

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
```

## Categories

Predefined categories include:
- Road Issue
- Garbage  
- Streetlight
- Waterlogging
- Pothole
- Traffic Signal
- Sidewalk
- Drainage
- Other

## Error Handling

- File type validation (images only)
- File size validation (max 10MB)
- Location detection fallbacks
- Network error handling
- Form validation with user feedback

## Mobile Support

- Camera capture enabled on mobile devices
- Responsive design for all screen sizes
- Touch-friendly interface
- GPS permissions handling

## Browser Compatibility

- Modern browsers with ES6+ support
- Geolocation API support
- File API support
- Camera access (mobile)

## Customization

The component uses Tailwind CSS classes and can be easily customized:

- Modify categories in the `categories` array
- Adjust validation rules in the Zod schema
- Customize styling with Tailwind classes
- Add additional form fields as needed

## Security Considerations

- File type validation on client and server
- File size limits
- GPS data validation
- XSS protection through React
- CSRF protection (implement on server)

## Performance

- Lazy loading of map components
- Image preview optimization
- Debounced location detection
- Efficient re-renders with React hooks
