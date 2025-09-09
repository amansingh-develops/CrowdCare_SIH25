import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api";
import { 
  Upload, 
  MapPin, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  X, 
  Camera,
  FileImage,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import exifr from "exifr";

interface EvidenceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: number;
  reportTitle: string;
  originalCoordinates: {
    latitude: number;
    longitude: number;
  };
}

interface GPSInfo {
  latitude?: number;
  longitude?: number;
  hasGps: boolean;
  accuracy?: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function EvidenceUploadModal({
  isOpen,
  onClose,
  reportId,
  reportTitle,
  originalCoordinates
}: EvidenceUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gpsInfo, setGpsInfo] = useState<GPSInfo | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [showLookOverlay, setShowLookOverlay] = useState(false);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [faceVerificationResult, setFaceVerificationResult] = useState<{
    verified: boolean;
    message: string;
  } | null>(null);
  // Face verification is now handled by the backend
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // File validation constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  // File validation function
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Please upload a valid image file (JPEG, PNG, or WebP)";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`;
    }
    return null;
  };

  const resolveReportMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiService.resolveReport(reportId, formData);
    },
    onSuccess: (data) => {
      setServerError(null);
      toast({
        title: "Success",
        description: `Issue resolved successfully! Your identity has been recorded. Distance verified: ${data.distance_meters}m`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
      handleClose();
    },
    onError: (error: Error) => {
      setServerError(error.message || "Failed to resolve issue");
      toast({
        title: "Error",
        description: error.message || "Failed to resolve issue",
        variant: "destructive",
      });
    },
  });

  // Precise EXIF GPS extraction using exifr with enhanced error handling
  const extractGPSFromImage = async (file: File): Promise<GPSInfo> => {
    try {
      console.log('Starting GPS extraction for file:', file.name, 'Size:', file.size);
      
      // First try: Direct GPS extraction
      const gps = await (exifr as any).gps(file);
      if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
        // Validate coordinate ranges
        if (gps.latitude >= -90 && gps.latitude <= 90 && 
            gps.longitude >= -180 && gps.longitude <= 180) {
          console.log('GPS extracted successfully:', gps.latitude, gps.longitude);
          return {
            hasGps: true,
            latitude: gps.latitude,
            longitude: gps.longitude,
            accuracy: typeof gps.accuracy === 'number' ? gps.accuracy : undefined,
          };
        } else {
          console.warn('Invalid GPS coordinates:', gps.latitude, gps.longitude);
        }
      }

      // Second try: Parse full metadata with comprehensive options
      const meta = await (exifr as any).parse(file, { 
        gps: true, 
        xmp: true, 
        exif: true,
        ifd0: true,
        ifd1: true,
        iptc: true,
        icc: true,
        jfif: true,
        ihdr: true
      });
      
      console.log('Full metadata extracted:', Object.keys(meta || {}));
      
      // Try multiple possible GPS field names
      const lat = meta?.latitude ?? meta?.GPSLatitude ?? meta?.gps?.latitude;
      const lon = meta?.longitude ?? meta?.GPSLongitude ?? meta?.gps?.longitude;
      
      if (typeof lat === 'number' && typeof lon === 'number') {
        // Validate coordinate ranges
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          console.log('GPS extracted from metadata:', lat, lon);
          return { hasGps: true, latitude: lat, longitude: lon };
        } else {
          console.warn('Invalid GPS coordinates from metadata:', lat, lon);
        }
      }
      
      console.log('No valid GPS data found in image');
      return { hasGps: false };
    } catch (error) {
      console.error('Error extracting GPS data with exifr:', error);
      return { hasGps: false };
    }
  };

  const processFile = async (file: File) => {
    // Validate file
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      return;
    }
    
    setFileError(null);
    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Extract GPS data from image
    const gpsData = await extractGPSFromImage(file);
    setGpsInfo(gpsData);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      await processFile(imageFile);
    } else {
      setFileError("Please drop a valid image file");
    }
  }, []);

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setGpsInfo(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startCamera = useCallback(async () => {
    try {
      if (isStartingRef.current) {
        console.log('Camera start already in progress, skipping...');
        return;
      }
      if (isCameraReady) {
        console.log('Camera already ready, skipping start...');
        return;
      }
      
      console.log('Starting camera...');
      isStartingRef.current = true;
      setCameraError(null);
      setIsCameraReady(false);
      setIsCameraLoading(true);
      
      // Stop any previous stream
      if (streamRef.current) {
        try { 
          streamRef.current.getTracks().forEach(t => t.stop()); 
        } catch {}
        streamRef.current = null;
      }
      
      let video = videoRef.current;
      if (!video) {
        console.log('Video element not found, waiting for it to be available...');
        // Wait a bit for the video element to be available
        await new Promise(resolve => setTimeout(resolve, 100));
        video = videoRef.current;
        if (!video) {
          console.error('Video element still not found after retry');
          throw new Error('Video element not found after retry');
        }
      }
      
      // Clear any existing video source
      video.srcObject = null;
      video.load(); // Reset the video element
      
      // Small delay to ensure video element is properly reset
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log('Video element found:', video);
      console.log('Video element in DOM:', document.contains(video));
      
      console.log('Requesting camera access...');
      console.log('Video element:', video);
      console.log('Video element ready state:', video.readyState);
      
      // Enhanced camera request with better constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { 
          facingMode: 'user',
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 }
        }
      });
      
      streamRef.current = stream;
      console.log('Camera stream obtained:', stream);
      console.log('Stream tracks:', stream.getTracks());
      
      // Set the stream
      video.srcObject = stream;
      console.log('Video srcObject set:', video.srcObject);
      
      // Set video properties
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      console.log('Video properties set:', {
        playsInline: video.playsInline,
        muted: video.muted,
        autoplay: video.autoplay
      });
      
      // Wait for video to load and be ready
      return new Promise<void>((resolve, reject) => {
        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState
          });
          
          // Ensure video is visible and playing
          video.style.display = 'block';
          video.style.backgroundColor = 'transparent';
          
          // Try to play the video
          video.play().then(() => {
            console.log('Video is playing');
            setIsCameraReady(true);
            setIsCameraLoading(false);
            resolve();
          }).catch((playError) => {
            console.warn('Video play failed, but continuing:', playError);
            setIsCameraReady(true);
            setIsCameraLoading(false);
            resolve();
          });
        };
        
        const handleError = (error: any) => {
          console.error('Video error:', error);
          reject(error);
        };
        
        // Add event listeners
        video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        video.addEventListener('error', handleError, { once: true });
        
        // Fallback timeout
        setTimeout(() => {
          console.log('Camera timeout - marking as ready anyway');
          setIsCameraReady(true);
          setIsCameraLoading(false);
          resolve();
        }, 3000);
      });
      
    } catch (err: any) {
      console.error('Camera error:', err);
      setIsCameraLoading(false);
      setCameraError(err?.message || 'Failed to access camera. Please allow camera permissions.');
      setIsCameraReady(false);
    } finally {
      isStartingRef.current = false;
    }
  }, []); // Remove isCameraReady from dependencies to prevent loop

  // Auto-start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened, starting camera...');
      startCamera();
    }
    // Cleanup handled in handleClose
  }, [isOpen]); // Remove startCamera from dependencies to prevent loop

  const captureFromVideo = async (): Promise<Blob | null> => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        console.error('Video or canvas element not found');
        return null;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Get video dimensions
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      
      console.log('Capturing photo:', { width, height });
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get canvas context');
        return null;
      }
      
      setIsCapturing(true);
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, width, height);
      
      // Convert to blob
      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((b) => {
          resolve(b);
        }, 'image/jpeg', 0.9);
      });
      
      setIsCapturing(false);
      
      if (!blob) {
        setCameraError('Failed to capture image. Please try again.');
        return null;
      }
      
      console.log('Photo captured successfully, size:', blob.size);
      return blob;
      
    } catch (err: any) {
      console.error('Capture error:', err);
      setIsCapturing(false);
      setCameraError(err?.message || 'Failed to capture image.');
      return null;
    }
  };

  // Convert blob to base64 for face verification
  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }, []);

  // Verify face using the instant API
  const verifyFaceInstant = useCallback(async (blob: Blob): Promise<boolean> => {
    try {
      setIsVerifyingFace(true);
      const base64 = await blobToBase64(blob);
      const result = await apiService.verifyFaceInstant(base64);
      
      setFaceVerificationResult({
        verified: result.success,
        message: result.success ? 'Human face verified' : 'Face verification failed'
      });
      
      return result.success;
    } catch (error) {
      console.error('Face verification error:', error);
      setFaceVerificationResult({
        verified: false,
        message: 'Face verification failed'
      });
      return false;
    } finally {
      setIsVerifyingFace(false);
    }
  }, [blobToBase64]);

  // Retry face verification
  const retryFaceVerification = useCallback(async () => {
    if (selfieBlob) {
      const verified = await verifyFaceInstant(selfieBlob);
      if (verified) {
        toast({
          title: 'Face verification successful',
          description: 'Human face verified on retry!'
        });
      }
    }
  }, [selfieBlob, verifyFaceInstant, toast]);

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select an evidence photo",
        variant: "destructive",
      });
      return;
    }

    if (fileError) {
      toast({
        title: "Error",
        description: fileError,
        variant: "destructive",
      });
      return;
    }

    let selfieToUse = selfieBlob;
    if (!selfieToUse) {
      // Show overlay and capture photo
      setShowLookOverlay(true);
      
      // Ensure camera is ready
      if (!isCameraReady || !streamRef.current) {
        try {
          console.log('Starting camera for verification...');
          await startCamera();
          // Wait for camera to be ready
          await new Promise((r) => setTimeout(r, 1500));
        } catch (e: any) {
          setShowLookOverlay(false);
          toast({ 
            title: 'Camera Error', 
            description: 'Unable to access camera for verification. Please ensure camera permissions are granted.', 
            variant: 'destructive' 
          });
          return;
        }
      }
      
      // Brief delay to let user position themselves
      await new Promise((r) => setTimeout(r, 1000));
      
      const blob = await captureFromVideo();
      setShowLookOverlay(false);
      
      if (!blob) {
        toast({ 
          title: 'Capture Failed', 
          description: 'Could not capture photo. Please try again.', 
          variant: 'destructive' 
        });
        return;
      }
      
      selfieToUse = blob;
      setSelfieBlob(blob);
      setSelfieCaptured(true);
      const url = URL.createObjectURL(blob);
      setSelfiePreviewUrl(url);
      
      // Verify face instantly after capture
      const faceVerified = await verifyFaceInstant(blob);
      
      if (faceVerified) {
        toast({
          title: 'Photo captured & verified',
          description: 'Photo captured and human face verified successfully!'
        });
      } else {
        toast({
          title: 'Photo captured',
          description: 'Photo captured but face verification failed. You can still use the photo.',
          variant: 'destructive'
        });
      }
    }

    // Note: Face verification is now handled by the backend during resolution
    // The frontend only captures the admin photo and submits it for backend processing

    const formData = new FormData();
    formData.append("resolution_image", selectedFile);
    if (adminNotes.trim()) {
      formData.append("admin_notes", adminNotes.trim());
    }
    if (gpsInfo?.latitude && gpsInfo?.longitude) {
      formData.append("latitude", gpsInfo.latitude.toString());
      formData.append("longitude", gpsInfo.longitude.toString());
    }
    // Attach admin verification selfie
    if (selfieToUse) {
      formData.append("admin_verification_image", selfieToUse, "admin_verification.jpg");
    }

    resolveReportMutation.mutate(formData);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setAdminNotes("");
    setPreviewUrl(null);
    setGpsInfo(null);
    setUploadProgress(null);
    setIsDragOver(false);
    setFileError(null);
    setServerError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Stop camera stream and cleanup
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    } catch {}
    if (selfiePreviewUrl) {
      URL.revokeObjectURL(selfiePreviewUrl);
    }
    setSelfiePreviewUrl(null);
    setSelfieBlob(null);
    setSelfieCaptured(false);
    setIsCameraReady(false);
    setCameraError(null);
    setFaceVerificationResult(null);
    setIsVerifyingFace(false);
    isStartingRef.current = false;
    onClose();
  };

  // Precise Haversine distance calculation (matches backend implementation)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    try {
      // Convert to radians
      const lat1_rad = lat1 * Math.PI / 180;
      const lon1_rad = lon1 * Math.PI / 180;
      const lat2_rad = lat2 * Math.PI / 180;
      const lon2_rad = lon2 * Math.PI / 180;
      
      // Haversine formula
      const dlat = lat2_rad - lat1_rad;
      const dlon = lon2_rad - lon1_rad;
      
      const a = Math.sin(dlat/2) * Math.sin(dlat/2) + 
                Math.cos(lat1_rad) * Math.cos(lat2_rad) * Math.sin(dlon/2) * Math.sin(dlon/2);
      const c = 2 * Math.asin(Math.sqrt(a));
      
      // Earth's radius in meters (WGS84)
      const earth_radius = 6371000;
      
      const distance = earth_radius * c;
      console.log(`Distance calculation: ${lat1},${lon1} to ${lat2},${lon2} = ${distance.toFixed(2)}m`);
      return distance;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return Infinity;
    }
  };

  const distance = gpsInfo?.latitude && gpsInfo?.longitude ? calculateDistance(
    originalCoordinates.latitude,
    originalCoordinates.longitude,
    gpsInfo.latitude,
    gpsInfo.longitude
  ) : null;

  const isWithinRadius = distance !== null && distance <= 30;
  // Require evidence file upload, GPS verification, and admin photo capture before enabling submission
  // Face verification is handled by the backend during resolution
  const canSubmit = Boolean(selectedFile) && !fileError && Boolean(gpsInfo?.hasGps) && isWithinRadius && selfieCaptured;
  
  // Enhanced validation logging
  console.log('Submission validation:', {
    hasFile: Boolean(selectedFile),
    noFileError: !fileError,
    hasGps: Boolean(gpsInfo?.hasGps),
    isWithinRadius,
    distance,
    adminPhotoCaptured: selfieCaptured,
    canSubmit
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[92vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Upload Resolution Evidence
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Info */}
          <div className="bg-muted/50 p-4 rounded-lg border">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileImage className="w-4 h-4" />
              Resolving Issue
            </h3>
            <p className="text-sm text-muted-foreground mb-2 font-medium">{reportTitle}</p>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="font-mono text-xs">
                {originalCoordinates.latitude.toFixed(6)}, {originalCoordinates.longitude.toFixed(6)}
              </span>
            </div>
          </div>

          {/* File Upload Area */}
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <img
                  src="/gps-map-camera-logo.png"
                  alt="GPS Map Camera"
                  className="inline-block w-5 h-5 mr-2 align-[-2px]"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                For precise location detection from photo, ensure Location is enabled in your camera settings before taking the photo. Alternatively, capture using the Google Maps camera. If you don't have it, download it from the
                {' '}<a
                  href="https://play.google.com/store/apps/details?id=com.gpsmapcamera.geotagginglocationonphoto"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium"
                >
                  Play Store
                </a>.
              </AlertDescription>
            </Alert>
            <Label htmlFor="evidence-photo" className="text-base font-medium">
              Evidence Photo <span className="text-red-500">*</span>
            </Label>
            
            {/* Drag and Drop Area */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragOver 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-muted-foreground/50",
                fileError && "border-red-500 bg-red-50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={previewUrl!}
                      alt="Evidence preview"
                      className="w-32 h-32 object-cover rounded-lg border shadow-sm"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={removeFile}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">Drop your evidence photo here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse files
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            {/* Hidden File Input */}
            <Input
              ref={fileInputRef}
              id="evidence-photo"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* File Requirements */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Supported formats: JPEG, PNG, WebP</p>
              <p>• Maximum file size: 10MB</p>
              <p>• GPS coordinates will be automatically extracted and verified</p>
            </div>

            {/* File Error */}
            {fileError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Admin Verification - Webcam Capture */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Admin Verification</Label>
            <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>Mandatory:</strong> Take a live photo for admin verification. Both evidence photo upload AND your live photo capture are required to resolve this report.
              </p>
              {cameraError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{cameraError}</AlertDescription>
                </Alert>
              )}
              
              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-muted-foreground bg-gray-100 p-2 rounded">
                  <strong>Debug Info:</strong><br/>
                  Camera Ready: {isCameraReady ? 'Yes' : 'No'}<br/>
                  Camera Loading: {isCameraLoading ? 'Yes' : 'No'}<br/>
                  Has Stream: {streamRef.current ? 'Yes' : 'No'}<br/>
                  Video Ready State: {videoRef.current?.readyState || 'N/A'}<br/>
                  Video Dimensions: {videoRef.current?.videoWidth || 'N/A'} x {videoRef.current?.videoHeight || 'N/A'}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="relative w-full aspect-video bg-black/5 rounded-lg overflow-hidden border">
                  {!selfieCaptured ? (
                    <div className="w-full h-full relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ 
                          backgroundColor: isCameraReady ? 'transparent' : '#000',
                          minHeight: '200px',
                          display: isCameraReady ? 'block' : 'none'
                        }}
                        onClick={() => {
                          console.log('Video clicked, current state:', {
                            isCameraReady,
                            isCameraLoading,
                            hasStream: !!streamRef.current,
                            videoReadyState: videoRef.current?.readyState,
                            videoSrcObject: !!videoRef.current?.srcObject,
                            videoWidth: videoRef.current?.videoWidth,
                            videoHeight: videoRef.current?.videoHeight
                          });
                        }}
                      />
                      {/* Buffering/Loading indicator */}
                      {(!isCameraReady || isCameraLoading) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="text-center">
                            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-white text-sm">
                              {isCameraLoading ? 'Starting camera...' : 'Camera not ready'}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Camera status indicator */}
                      {isCameraReady && streamRef.current && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                          ● LIVE
                        </div>
                      )}
                    </div>
                  ) : (
                    <img
                      src={selfiePreviewUrl || ''}
                      alt="Selfie preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Photo capture overlay */}
                  {showLookOverlay && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="bg-white text-black px-4 py-2 rounded shadow">
                        Taking photo in 3 seconds...
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={async () => {
                        try {
                          setCameraError(null);
                          
                          // Ensure camera is ready
                          if (!isCameraReady || !streamRef.current) {
                            await startCamera();
                            await new Promise((r) => setTimeout(r, 1500));
                          }
                          
                          const blob = await captureFromVideo();
                          if (!blob) {
                            return;
                          }
                          
                          setSelfieBlob(blob);
                          setSelfieCaptured(true);
                          const url = URL.createObjectURL(blob);
                          setSelfiePreviewUrl(url);
                          
                          // Verify face instantly after capture
                          const faceVerified = await verifyFaceInstant(blob);
                          
                          if (faceVerified) {
                            toast({
                              title: 'Photo captured & verified',
                              description: 'Photo captured and human face verified successfully!'
                            });
                          } else {
                            toast({
                              title: 'Photo captured',
                              description: 'Photo captured but face verification failed. You can still use the photo.',
                              variant: 'destructive'
                            });
                          }
                          
                        } catch (err: any) {
                          console.error('Capture error:', err);
                          setCameraError(err?.message || 'Failed to capture image.');
                        }
                      }}
                      disabled={isCapturing || selfieCaptured}
                    >
                      {isCapturing ? 'Capturing...' : 'Take Photo'}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={async () => {
                        try {
                          // Clean up previous photo
                          if (selfiePreviewUrl) URL.revokeObjectURL(selfiePreviewUrl);
                          setSelfiePreviewUrl(null);
                          setSelfieBlob(null);
                          setSelfieCaptured(false);
                          setFaceVerificationResult(null);
                          
                          // Force stop current stream
                          if (streamRef.current) {
                            try { 
                              streamRef.current.getTracks().forEach(t => t.stop()); 
                            } catch {}
                            streamRef.current = null;
                          }
                          
                          // Reset camera state
                          setCameraError(null);
                          setIsCameraReady(false);
                          setIsCameraLoading(true);
                          isStartingRef.current = false; // Reset the starting flag
                          
                          // Small delay to ensure cleanup is complete
                          await new Promise(resolve => setTimeout(resolve, 100));
                          
                          // Restart camera
                          await startCamera();
                        } catch (err: any) {
                          console.error('Error restarting camera for retake:', err);
                          setCameraError(err?.message || 'Failed to restart camera. Please try again.');
                        }
                      }}
                      disabled={!selfieCaptured}
                    >
                      Retake
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong>Required:</strong> Your live photo capture is mandatory to resolve this report. Face verification will be handled automatically.
                  </p>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Face verification status */}
              {faceVerificationResult && (
                <div className={cn(
                  "border rounded-lg p-3 mt-3",
                  faceVerificationResult.verified 
                    ? "bg-green-50 border-green-200" 
                    : "bg-yellow-50 border-yellow-200"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {faceVerificationResult.verified ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      )}
                      <p className={cn(
                        "text-sm",
                        faceVerificationResult.verified ? "text-green-800" : "text-yellow-800"
                      )}>
                        {faceVerificationResult.message}
                      </p>
                    </div>
                    {!faceVerificationResult.verified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={retryFaceVerification}
                        disabled={isVerifyingFace}
                        className="ml-2"
                      >
                        <RefreshCw className={cn("w-3 h-3 mr-1", isVerifyingFace && "animate-spin")} />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Face verification loading */}
              {isVerifyingFace && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-blue-800">Verifying human face...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Requirements Status */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Resolution Requirements</Label>
            <div className="bg-muted/50 p-4 rounded-lg border space-y-2">
              <div className="flex items-center gap-2">
                {selectedFile && gpsInfo?.hasGps && isWithinRadius ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${selectedFile && gpsInfo?.hasGps && isWithinRadius ? 'text-green-600' : 'text-red-600'}`}>
                  Evidence Photo with GPS Verification
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selfieCaptured ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${selfieCaptured ? 'text-green-600' : 'text-red-600'}`}>
                  Admin Live Photo Capture
                </span>
              </div>
              {!canSubmit && (
                <p className="text-xs text-muted-foreground mt-2">
                  Both requirements must be completed before you can resolve this report. Face verification will be handled automatically by the system.
                </p>
              )}
            </div>
          </div>

          {/* Image Preview with GPS Info */}
          {previewUrl && gpsInfo && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Location Verification</Label>
              <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Evidence Location: {gpsInfo.latitude?.toFixed(6)}, {gpsInfo.longitude?.toFixed(6)}
                  </span>
                  {gpsInfo.accuracy && (
                    <span className="text-xs text-muted-foreground">
                      (±{gpsInfo.accuracy.toFixed(1)}m accuracy)
                    </span>
                  )}
                </div>
                
                {distance !== null && (
                  <div className="flex items-center gap-2">
                    {isWithinRadius ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${isWithinRadius ? 'text-green-600' : 'text-red-600'}`}>
                      Distance: {distance.toFixed(2)}m {isWithinRadius ? '(Within 30m radius)' : '(Outside 30m radius)'}
                    </span>
                  </div>
                )}

                {!gpsInfo.hasGps && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <img
                        src="/gps-map-camera-logo.png"
                        alt="GPS Map Camera"
                        className="inline-block w-5 h-5 mr-2 align-[-2px]"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      No GPS data found in the uploaded photo. For precise location detection from photo, ensure Location is enabled in your camera settings before taking the photo. Alternatively, capture using the Google Maps camera. If you don't have it, download it from the{' '}
                      <a
                        href="https://play.google.com/store/apps/details?id=com.gpsmapcamera.geotagginglocationonphoto"
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-medium"
                      >
                        Play Store
                      </a>.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              {!isWithinRadius && gpsInfo.hasGps && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Evidence photo location does not match the reported issue area. 
                    Please take a photo from within 30 meters of the original location.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="admin-notes" className="text-base font-medium">
              Resolution Notes <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="admin-notes"
              placeholder="Add any notes about the resolution, work performed, or additional context..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {adminNotes.length}/500 characters
            </p>
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress.percentage}%</span>
              </div>
              <Progress value={uploadProgress.percentage} className="w-full" />
            </div>
          )}

          {/* Backend Error */}
          {serverError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={resolveReportMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || resolveReportMutation.isPending}
              className="min-w-[140px]"
            >
              {resolveReportMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {!canSubmit ? 'Complete Requirements' : 'Resolve Issue'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

