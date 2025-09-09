import React, { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiService } from '@/lib/api';
import exifr from 'exifr';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Camera, MapPin, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { CameraCapture } from '@/components/CameraCapture';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Form validation schema
const reportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description must be less than 2000 characters'),
  category: z.string().min(1, 'Category is required'),
  image: z.any().refine((file) => file && file.length > 0, 'Image is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface LocationData {
  latitude: number;
  longitude: number;
  source: 'exif' | 'geolocation' | 'manual';
}

const categories = [
  'Road Issue',
  'Garbage',
  'Streetlight',
  'Waterlogging',
  'Pothole',
  'Traffic Signal',
  'Sidewalk',
  'Drainage',
  'Other'
];

export default function ReportForm() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      latitude: 0,
      longitude: 0,
    },
  });

  const watchedImage = watch('image');

  // Extract GPS data from EXIF using enhanced methods
  const extractGPSFromImage = useCallback(async (file: File): Promise<LocationData | null> => {
    try {
      console.log('🔍 Extracting GPS from image:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Method 1: Try exifr with comprehensive options
      try {
        console.log('✅ Using exifr for EXIF extraction');
        
        const exifData = await exifr.parse(file, { 
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
        
        const exifData = await exifr.parse(arrayBuffer, { 
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
            source: 'geolocation',
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, []);

  // Handle image selection from file input
  const handleImageChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
  }, []);

  // Handle image capture from camera
  const handleCameraCapture = useCallback(async (file: File, faceVerified?: boolean) => {
    await processImageFile(file);
    setShowCamera(false);
    
    // Show face verification result if available
    if (faceVerified !== undefined) {
      if (faceVerified) {
        toast({
          title: 'Face verified',
          description: 'Human face detected and verified in the photo.',
        });
      } else {
        toast({
          title: 'Face verification failed',
          description: 'No human face detected. You can still submit the report.',
          variant: 'destructive'
        });
      }
    }
  }, [processImageFile, toast]);

  // Process image file (common logic for both file input and camera capture)
  const processImageFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setValue('image', [file]);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Try to extract GPS data from EXIF
    const gpsData = await extractGPSFromImage(file);
    if (gpsData) {
      setLocationData(gpsData);
      setValue('latitude', gpsData.latitude);
      setValue('longitude', gpsData.longitude);
      toast({
        title: 'Location detected',
        description: `GPS coordinates found in image: ${gpsData.latitude.toFixed(6)}, ${gpsData.longitude.toFixed(6)}`,
      });
    } else {
      // Fallback to browser geolocation
      try {
        setIsDetectingLocation(true);
        const currentLocation = await getCurrentLocation();
        setLocationData(currentLocation);
        setValue('latitude', currentLocation.latitude);
        setValue('longitude', currentLocation.longitude);
        toast({
          title: 'Location detected',
          description: `Using current location: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`,
        });
      } catch (error) {
        toast({
          title: 'Location detection failed',
          description: 'Could not detect location from image or GPS. Please use the "Detect My Location" button.',
          variant: 'destructive',
        });
      } finally {
        setIsDetectingLocation(false);
      }
    }
  }, [extractGPSFromImage, getCurrentLocation, setValue, toast]);

  // Manual location detection
  const handleDetectLocation = useCallback(async () => {
    try {
      setIsDetectingLocation(true);
      const currentLocation = await getCurrentLocation();
      setLocationData(currentLocation);
      setValue('latitude', currentLocation.latitude);
      setValue('longitude', currentLocation.longitude);
      toast({
        title: 'Location detected',
        description: `Current location: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`,
      });
    } catch (error) {
      toast({
        title: 'Location detection failed',
        description: 'Could not access your location. Please check your browser permissions.',
        variant: 'destructive',
      });
    } finally {
      setIsDetectingLocation(false);
    }
  }, [getCurrentLocation, setValue, toast]);

  // Form submission
  const onSubmit = async (data: ReportFormData) => {
    if (!selectedFile) {
      toast({
        title: 'No image selected',
        description: 'Please select an image before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('category', data.category);
      formData.append('image', selectedFile);
      formData.append('latitude', data.latitude.toString());
      formData.append('longitude', data.longitude.toString());

      const response = await apiService.createReport(formData);

      toast({
        title: 'Report submitted successfully',
        description: 'Your report has been submitted and will be reviewed.',
      });

      // Reset form
      reset();
      setImagePreview(null);
      setLocationData(null);
      setShowMap(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: 'Submission failed',
        description: 'There was an error submitting your report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Report an Issue</h1>
        <p className="text-gray-600">Help improve your community by reporting issues with photos and location data.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium text-gray-700">
            Title *
          </label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Brief description of the issue"
            className={cn(errors.title && 'border-red-500')}
          />
          {errors.title && (
            <p className="text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

                  {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description *
            </label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Detailed description of the issue..."
              rows={6}
              className={cn(errors.description && 'border-red-500')}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

        {/* Category */}
        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium text-gray-700">
            Category *
          </label>
          <Select onValueChange={(value) => setValue('category', value)}>
            <SelectTrigger className={cn(errors.category && 'border-red-500')}>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-red-600">{errors.category.message}</p>
          )}
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
            <div className="font-semibold mb-1">Important instruction</div>
            <div>
              <img
                src="/gps-map-camera-logo.png"
                alt="GPS Map Camera"
                className="inline-block w-5 h-5 mr-2 align-[-2px]"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              For precise location detection from photo, ensure Location is enabled in your camera settings before taking the photo.
              Alternatively, capture using the Google Maps camera. If you don't have it, download it from the
              {' '}<a
                href="https://play.google.com/store/apps/details?id=com.gpsmapcamera.geotagginglocationonphoto"
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold"
              >
                Play Store
              </a>.
            </div>
          </div>
          <label htmlFor="image" className="text-sm font-medium text-gray-700">
            Photo *
          </label>
          <div className="space-y-4">
            {/* Upload Options */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload from Device
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCamera(!showCamera)}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                {showCamera ? 'Hide Camera' : 'Take Photo'}
              </Button>
            </div>

            {/* Hidden File Input */}
            <Input
              id="image"
              type="file"
              accept="image/*"
              capture="environment"
              {...register('image')}
              onChange={handleImageChange}
              ref={fileInputRef}
              className="hidden"
            />

            {/* Camera Capture */}
            {showCamera && (
              <div className="border rounded-lg p-4">
                <CameraCapture
                  onCapture={handleCameraCapture}
                  facingMode="environment"
                  className="w-full"
                />
              </div>
            )}

            {errors.image && (
              <p className="text-sm text-red-600">{errors.image.message}</p>
            )}

            {/* Image Preview */}
            {imagePreview && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Image Preview:</p>
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-w-md h-48 object-cover rounded-lg border"
                  />
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    <Camera className="w-3 h-3 inline mr-1" />
                    Photo
                  </div>
                </div>
              </div>
            )}

            {!locationData && imagePreview && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                <div className="font-semibold mb-1">No GPS data found in the uploaded photo.</div>
                <div>
                  <img
                    src="/gps-map-camera-logo.png"
                    alt="GPS Map Camera"
                    className="inline-block w-5 h-5 mr-2 align-[-2px]"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  For precise location detection from photo, ensure Location is enabled in your camera settings before taking the photo.
                  Alternatively, capture using the Google Maps camera. If you don't have it, download it from the
                  {' '}<a
                    href="https://play.google.com/store/apps/details?id=com.gpsmapcamera.geotagginglocationonphoto"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-semibold"
                  >
                    Play Store
                  </a>.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Location Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Location Data
            </label>
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
              Detect My Location
            </Button>
          </div>

          {locationData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Location Detected ({locationData.source === 'exif' ? 'from photo' : 'from GPS'})
                </span>
              </div>
              <div className="text-sm text-green-700">
                <p>Latitude: {locationData.latitude.toFixed(6)}</p>
                <p>Longitude: {locationData.longitude.toFixed(6)}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowMap(!showMap)}
              >
                {showMap ? 'Hide Map' : 'Show on Map'}
              </Button>
            </div>
          )}

          {!locationData && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  No location data detected. Please use "Detect My Location" or ensure your photo has GPS data.
                </span>
              </div>
            </div>
          )}

          {/* Map Preview */}
          {showMap && locationData && (
            <div className="border rounded-lg overflow-hidden">
              <div className="h-64 w-full">
                <MapContainer
                  center={[locationData.latitude, locationData.longitude]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[locationData.latitude, locationData.longitude]}>
                    <Popup>
                      <div className="text-center">
                        <p className="font-medium">Report Location</p>
                        <p className="text-sm text-gray-600">
                          {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !selectedFile}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting Report...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>
          {!selectedFile && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Please select a photo before submitting.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
