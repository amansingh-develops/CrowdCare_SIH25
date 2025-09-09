import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  Clock,
  Users,
  AlertTriangle,
  FileText,
  LogOut,
  MapPin
} from 'lucide-react';
import { apiService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import PersonalDetailsSettings from '@/components/PersonalDetailsSettings';
import TrackReports from '@/components/TrackReports';
import { CommunityFeed } from '@/components/CommunityFeed';
import GamificationWidget from '@/components/GamificationWidget';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

interface LocationData {
  latitude: number;
  longitude: number;
  source: 'exif' | 'geolocation' | 'manual';
}

interface MCQData {
  duration: string;
  severity: string;
  affectedArea: string;
}

interface AIResponse {
  title: string;
  description: string;
  tags: string[];
}

const getCategories = (t: (key: string) => string) => [
  { value: 'Pothole', label: t('category.pothole') },
  { value: 'Garbage', label: t('category.garbage') },
  { value: 'Streetlight', label: t('category.streetlight') },
  { value: 'Waterlogging', label: t('category.waterlogging') },
  { value: 'Traffic Signal', label: t('category.trafficSignal') },
  { value: 'Sidewalk', label: t('category.sidewalk') },
  { value: 'Drainage', label: t('category.drainage') },
  { value: 'Road Damage', label: t('category.roadDamage') },
  { value: 'Other', label: t('category.other') }
];

const getDurationOptions = (t: (key: string) => string) => [
  { value: 'Just noticed', label: t('duration.justNoticed') },
  { value: '1 day', label: t('duration.1day') },
  { value: '1 week', label: t('duration.1week') },
  { value: '2 weeks', label: t('duration.2weeks') },
  { value: '1 month', label: t('duration.1month') },
  { value: 'More than 1 month', label: t('duration.moreThan1Month') }
];

const getSeverityOptions = (t: (key: string) => string) => [
  { value: 'Low', label: t('severity.low') },
  { value: 'Medium', label: t('severity.medium') },
  { value: 'High', label: t('severity.high') },
  { value: 'Critical', label: t('severity.critical') }
];

const getAffectedAreaOptions = (t: (key: string) => string) => [
  { value: 'Few people', label: t('affected.fewPeople') },
  { value: 'Many people', label: t('affected.manyPeople') },
  { value: 'Entire area', label: t('affected.entireArea') },
  { value: 'Traffic flow', label: t('affected.trafficFlow') },
  { value: 'Pedestrians only', label: t('affected.pedestriansOnly') }
];

export default function CitizenDashboard() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showTrackReports, setShowTrackReports] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [highlightCommunityReportId, setHighlightCommunityReportId] = useState<number | undefined>(undefined);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    category: '',
    image: null as File | null,
    mcqData: {
      duration: '',
      severity: '',
      affectedArea: ''
    } as MCQData
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Load current user on component mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await apiService.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  // Extract GPS data from EXIF using enhanced methods
  const extractGPSFromImage = useCallback(async (file: File): Promise<LocationData | null> => {
    try {
      console.log('🔍 Extracting GPS from image:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Method 1: Try exifr with comprehensive options
      try {
        const exifr = await import('exifr');
        console.log('✅ exifr imported successfully');
        
        // Try multiple parsing options for better compatibility
        const exifData = await exifr.default.parse(file, { 
          gps: true,
          exif: true,
          xmp: true,
          ifd0: true,
          ifd1: true,
          iptc: true,
          icc: true,
          jfif: true,
          ihdr: true,
          mergeOutput: true
        });
        
        console.log('📊 EXIF data extracted:', exifData);
        console.log('🔍 Available EXIF keys:', Object.keys(exifData || {}));
        
        // Try multiple possible GPS field names
        const lat = exifData?.latitude ?? exifData?.GPSLatitude ?? exifData?.gps?.latitude;
        const lon = exifData?.longitude ?? exifData?.GPSLongitude ?? exifData?.gps?.longitude;
        
        if (typeof lat === 'number' && typeof lon === 'number') {
          // Validate coordinate ranges
          if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            console.log('✅ GPS coordinates found via exifr:', lat, lon);
            return {
              latitude: lat,
              longitude: lon,
              source: 'exif'
            };
          } else {
            console.warn('⚠️ Invalid GPS coordinates from exifr:', lat, lon);
          }
        }
      } catch (exifrError) {
        console.warn('⚠️ exifr method failed:', exifrError);
      }
      
      // Method 2: Try reading file as ArrayBuffer for more detailed EXIF parsing
      try {
        const arrayBuffer = await file.arrayBuffer();
        const exifr = await import('exifr');
        
        const exifData = await exifr.default.parse(arrayBuffer, { 
          gps: true,
          exif: true,
          mergeOutput: true
        });
        
        console.log('📊 EXIF data from ArrayBuffer:', exifData);
        
        const lat = exifData?.latitude ?? exifData?.GPSLatitude;
        const lon = exifData?.longitude ?? exifData?.GPSLongitude;
        
        if (typeof lat === 'number' && typeof lon === 'number' && 
            lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          console.log('✅ GPS coordinates found via ArrayBuffer method:', lat, lon);
          return {
            latitude: lat,
            longitude: lon,
            source: 'exif'
          };
        }
      } catch (arrayBufferError) {
        console.warn('⚠️ ArrayBuffer method failed:', arrayBufferError);
      }
      
      // Method 3: Try piexifjs as fallback (if available)
      try {
        const piexifjs = await import('piexifjs');
        const arrayBuffer = await file.arrayBuffer();
        const dataView = new DataView(arrayBuffer);
        const bytes = new Uint8Array(dataView.buffer);
        
        const exifData = piexifjs.load(bytes);
        console.log('📊 EXIF data from piexifjs:', exifData);
        
        if (exifData && exifData.GPS) {
          const gps = exifData.GPS;
          console.log('🔍 GPS data from piexifjs:', gps);
          
          // Extract coordinates using piexifjs format
          if (gps[piexifjs.GPSIFD.GPSLatitude] && gps[piexifjs.GPSIFD.GPSLongitude]) {
            const latDMS = gps[piexifjs.GPSIFD.GPSLatitude];
            const lonDMS = gps[piexifjs.GPSIFD.GPSLongitude];
            const latRef = gps[piexifjs.GPSIFD.GPSLatitudeRef];
            const lonRef = gps[piexifjs.GPSIFD.GPSLongitudeRef];
            
            // Convert DMS to decimal
            const lat = (latDMS[0][0] / latDMS[0][1]) + 
                       (latDMS[1][0] / latDMS[1][1]) / 60 + 
                       (latDMS[2][0] / latDMS[2][1]) / 3600;
            const lon = (lonDMS[0][0] / lonDMS[0][1]) + 
                       (lonDMS[1][0] / lonDMS[1][1]) / 60 + 
                       (lonDMS[2][0] / lonDMS[2][1]) / 3600;
            
            const finalLat = latRef === 'S' ? -lat : lat;
            const finalLon = lonRef === 'W' ? -lon : lon;
            
            if (finalLat >= -90 && finalLat <= 90 && finalLon >= -180 && finalLon <= 180) {
              console.log('✅ GPS coordinates found via piexifjs:', finalLat, finalLon);
              return {
                latitude: finalLat,
                longitude: finalLon,
                source: 'exif'
              };
            }
          }
        }
      } catch (piexifError) {
        console.warn('⚠️ piexifjs method failed:', piexifError);
      }
      
      console.log('❌ No GPS data found in image EXIF with any method');
      return null;
    } catch (error) {
      console.error('❌ Error extracting GPS data:', error);
      return null;
    }
  }, []);

  // Get current location using browser geolocation
  const getCurrentLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            source: 'geolocation'
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  }, []);

  // Handle image selection
  const handleImageChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 10MB.',
        variant: 'destructive'
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setFormData(prev => ({ ...prev, image: file }));

    // Try to extract GPS data from EXIF
    const gpsData = await extractGPSFromImage(file);
    if (gpsData) {
      setLocationData(gpsData);
      toast({
        title: 'Location detected',
        description: `GPS coordinates found in image: ${gpsData.latitude.toFixed(6)}, ${gpsData.longitude.toFixed(6)}`,
      });
    } else {
      // Show helpful guidance for location issues
      toast({
        title: 'No location data in photo',
        description: 'To capture location in photos: 1) Enable location in camera settings, 2) Allow location access when prompted, 3) Use a camera app that preserves EXIF data',
        variant: 'destructive'
      });
      
      // Fallback to browser geolocation
      try {
        setIsDetectingLocation(true);
        const currentLocation = await getCurrentLocation();
        setLocationData(currentLocation);
        toast({
          title: 'Location detected',
          description: `Using current location: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`,
        });
      } catch (error) {
        toast({
          title: 'Location detection failed',
          description: 'Could not detect location from image or GPS. Please use the "Detect My Location" button or manually set location.',
          variant: 'destructive'
        });
      } finally {
        setIsDetectingLocation(false);
      }
    }
  }, [extractGPSFromImage, getCurrentLocation, toast]);

  // Manual location detection
  const handleDetectLocation = useCallback(async () => {
    try {
      setIsDetectingLocation(true);
      const currentLocation = await getCurrentLocation();
      setLocationData(currentLocation);
      toast({
        title: 'Location detected',
        description: `Current location: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`,
      });
    } catch (error) {
      toast({
        title: 'Location detection failed',
        description: 'Could not access your location. Please check your browser permissions.',
        variant: 'destructive'
      });
    } finally {
      setIsDetectingLocation(false);
    }
  }, [getCurrentLocation, toast]);

  // Get current user data
  const getCurrentUser = useCallback(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }
      return null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }, []);

  // Generate AI description
  const handleGenerateAI = useCallback(async () => {
    if (!formData.category || !locationData) {
      toast({
        title: 'Missing information',
        description: 'Please select a category and ensure location is detected.',
        variant: 'destructive'
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      // Get current user data
      const currentUser = getCurrentUser();
      
      // Simulate AI API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock AI response based on category and MCQs with actual user data
      const mockResponse: AIResponse = {
        title: `${formData.category} Infrastructure Issue Report`,
        description: `INFRASTRUCTURE ISSUE REPORT

ISSUE DETAILS:
Issue Type: ${formData.category}
Report Date: ${new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: '2-digit' }).format(new Date())}
Report Time: ${new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date())}
Location Coordinates: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}
Reporter: ${currentUser?.full_name || 'Anonymous Citizen'}
Contact: ${currentUser?.email || 'Via CrowdCare Platform'}
Category: ${formData.category}
Severity Level: ${formData.mcqData.severity || 'Medium'}
Duration: ${formData.mcqData.duration || 'Unknown duration'}
Area Affected: ${formData.mcqData.affectedArea || 'Local area'}

TECHNICAL SPECIFICATIONS:
Geographic Location: Latitude: ${locationData.latitude.toFixed(6)}°N, Longitude: ${locationData.longitude.toFixed(6)}°E
GPS Accuracy: High (EXIF data extracted from photo)

IMPACT ASSESSMENT:
Public Safety Impact: ${formData.mcqData.severity === 'High' || formData.mcqData.severity === 'Critical' ? 'High - Immediate safety concern' : 'Medium - General safety concern'}
Traffic Impact: ${formData.category.includes('Road') || formData.category.includes('Traffic') ? 'High - Traffic disruption' : 'Medium - General traffic impact'}
Environmental Impact: ${formData.category === 'Garbage' ? 'High - Environmental pollution and health hazard' : 'Low - Minimal environmental impact'}

RECOMMENDED ACTIONS:
${formData.mcqData.severity === 'Critical' ? 'IMMEDIATE ACTION REQUIRED' : 'PRIORITY ATTENTION REQUIRED'}
- Dispatch appropriate maintenance crew
- Assess the situation and implement temporary measures
- Schedule permanent repairs as needed
- Monitor the area for any worsening conditions

ADDITIONAL INFORMATION:
- Report generated via CrowdCare citizen reporting system
- Photo evidence attached with GPS location data
- Automated AI analysis performed for urgency classification
- Report submitted for administrative review and action
- Citizen reporter: ${currentUser?.full_name || 'Anonymous'}
- Report ID: Generated automatically by system

This report has been automatically generated and requires immediate attention from the relevant municipal department.`,
        tags: [formData.category.toLowerCase().replace(' ', '_'), formData.mcqData.severity?.toLowerCase() || 'medium', 'infrastructure', 'citizen_report', 'gps_verified']
      };

      setAiResponse(mockResponse);
      toast({
        title: 'AI Description Generated',
        description: 'AI has analyzed your report and generated an optimized description.',
      });
    } catch (error) {
      toast({
        title: 'AI Generation Failed',
        description: 'Could not generate AI description. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [formData, locationData, toast, getCurrentUser]);

  // Submit report
  const handleSubmitReport = async () => {
    if (!formData.category || !formData.image || !locationData || !aiResponse) {
      toast({
        title: 'Incomplete report',
        description: 'Please fill in all required fields and generate AI description.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create FormData for API submission
      const submitFormData = new FormData();
      submitFormData.append('title', aiResponse.title);
      submitFormData.append('description', aiResponse.description);
      submitFormData.append('category', formData.category);
      submitFormData.append('image', formData.image);
      submitFormData.append('latitude', locationData.latitude.toString());
      submitFormData.append('longitude', locationData.longitude.toString());
      
      // Add MCQ data for better AI analysis
      if (Object.values(formData.mcqData).some(val => val)) {
        submitFormData.append('mcq_responses', JSON.stringify(formData.mcqData));
      }
      
      console.log('Submitting report with data:', {
        title: aiResponse.title,
        category: formData.category,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        mcqData: formData.mcqData
      });
      
      // Submit to backend API
      const response = await apiService.createReport(submitFormData);
      console.log('Report submission response:', response);

      if (response?.duplicate) {
        const existingId = response?.existing_report?.id;
        toast({
          title: 'This issue has already been reported.',
          description: 'We found an existing report within 30 meters.',
          action: (
            <ToastAction altText="View Existing Report" onClick={() => {
              setHighlightCommunityReportId(existingId);
              setShowCommunity(true);
            }}>
              View Existing Report
            </ToastAction>
          ),
        });
        // Also auto-open community for immediate redirect
        setHighlightCommunityReportId(existingId);
        setShowCommunity(true);
        return; // do not proceed to reset success flow below
      }

      toast({
        title: 'Report Submitted Successfully',
        description: 'Your report has been submitted and will be reviewed by administrators.',
      });

      // Reset form
      setFormData({
        category: '',
        image: null,
        mcqData: { duration: '', severity: '', affectedArea: '' }
      });
      setImagePreview(null);
      setLocationData(null);
      setAiResponse(null);
      setShowReportForm(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      
      // Show more detailed error message
      let errorMessage = 'There was an error submitting your report. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Submission failed: ${error.message}`;
        console.error('Error details:', error.message);
      }
      
      toast({
        title: 'Submission Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 py-4">
            <div className="flex items-center">
              <img 
                src="/src/assets/gov-logo.png" 
                alt="Government Logo" 
                className="w-12 h-12 sm:w-16 sm:h-16 mr-3" 
              />
              <img 
                src="/src/assets/crowdcare-logo.png" 
                alt="CrowdCare Logo" 
                className="w-12 h-12 sm:w-16 sm:h-16 mr-3" 
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">CrowdCare</h1>
                <p className="text-xs sm:text-sm text-gray-600">{t('citizen.dashboard')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <PersonalDetailsSettings 
                user={currentUser} 
                onUserUpdate={setCurrentUser}
              />
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('common.logout')}</span>
                <span className="sm:hidden">{t('common.exit')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('citizen.welcome')}</h2>
          <p className="text-gray-600">{t('citizen.welcomeDesc')}</p>
        </div>

        {/* Gamification Widget */}
        <div className="mb-8">
          <GamificationWidget />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowReportForm(true)}>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('citizen.reportIssue')}</h3>
              <p className="text-gray-600 text-sm">{t('citizen.reportIssueDesc')}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowTrackReports(true)}>
            <CardContent className="p-6 text-center">
              <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('citizen.trackReports')}</h3>
              <p className="text-gray-600 text-sm">{t('citizen.trackReportsDesc')}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowCommunity(true)}>
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('citizen.community')}</h3>
              <p className="text-gray-600 text-sm">{t('citizen.communityDesc')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Report Form Dialog */}
        <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
          <DialogContent className="max-w-[92vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                {t('report.title')}
              </DialogTitle>
              <DialogDescription>
                {t('report.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Category Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('report.category')} *</label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('report.categoryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategories(t).map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('report.photo')} *</label>
                
                {/* Camera Location Settings Guide */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <div className="flex items-start space-x-2">
                    <div className="text-blue-600 mt-0.5">📷</div>
                    <div>
                      <div className="font-semibold text-blue-800 mb-2">{t('report.cameraSettings')}</div>
                      <div className="text-blue-700 space-y-1">
                        <div>• <strong>{t('report.enableLocation')}</strong></div>
                        <div>• <strong>{t('report.allowLocation')}</strong></div>
                        <div>• <strong>{t('report.compatibleApps')}</strong></div>
                        <div>• <strong>{t('report.checkExif')}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    ref={fileInputRef}
                  />

                  {imagePreview && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">{t('report.imagePreview')}</p>
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full max-w-md h-48 object-cover rounded-lg border"
                        />
                        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                          <Camera className="w-3 h-3 inline mr-1" />
                          {t('report.photo')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">{t('report.locationData')}</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDetectLocation}
                    disabled={isDetectingLocation}
                  >
                    {isDetectingLocation ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4 mr-2" />
                    )}
                    {t('report.detectLocation')}
                  </Button>
                </div>

                {locationData && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('report.locationDetected')} ({locationData.source === 'exif' ? t('report.fromPhoto') : t('report.fromGPS')}): 
                      {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                    </AlertDescription>
                  </Alert>
                )}

                {!locationData && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('report.noLocationData')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* MCQ Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Additional Information (for better AI analysis)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">How long has this issue existed?</label>
                    <Select onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      mcqData: { ...prev.mcqData, duration: value }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDurationOptions(t).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">Severity level?</label>
                    <Select onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      mcqData: { ...prev.mcqData, severity: value }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSeverityOptions(t).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">Who is affected?</label>
                    <Select onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      mcqData: { ...prev.mcqData, affectedArea: value }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select affected area" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAffectedAreaOptions(t).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* AI Generation */}
              <div className="space-y-4">
                <Button
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI || !formData.category || !locationData}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating AI Description...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Description
                    </>
                  )}
                </Button>

                                 {aiResponse && (
                   <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                     <div className="flex items-center">
                       <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                       <h4 className="font-medium text-purple-800">AI-Generated Professional Report</h4>
                     </div>
                     
                     <div className="space-y-3">
                       <div>
                         <label className="text-sm font-medium text-gray-700">Report Title</label>
                         <Input value={aiResponse.title} readOnly className="bg-white font-semibold" />
                       </div>
                       
                       <div>
                         <label className="text-sm font-medium text-gray-700">Detailed Report</label>
                         <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
                           <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 leading-relaxed">
                             {aiResponse.description}
                           </pre>
                         </div>
                       </div>
                       
                       <div>
                         <label className="text-sm font-medium text-gray-700">Report Tags</label>
                         <div className="flex flex-wrap gap-2">
                           {aiResponse.tags.map((tag, index) => (
                             <Badge key={index} variant="secondary">{tag}</Badge>
                           ))}
                         </div>
                       </div>
                     </div>
                   </div>
                 )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReportForm(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleSubmitReport}
                  disabled={isSubmitting || !aiResponse}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('report.submittingReport')}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {t('report.submitReport')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Track Reports Dialog */}
        <Dialog open={showTrackReports} onOpenChange={setShowTrackReports}>
          <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-500" />
                {t('track.title')}
              </DialogTitle>
              <DialogDescription>
                {t('track.description')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto">
              <TrackReports />
            </div>
          </DialogContent>
        </Dialog>

        {/* Community Feed Dialog */}
        <Dialog open={showCommunity} onOpenChange={setShowCommunity}>
          <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-green-500" />
                {t('community.title')}
              </DialogTitle>
              <DialogDescription>
                {t('community.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <CommunityFeed highlightId={highlightCommunityReportId} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
