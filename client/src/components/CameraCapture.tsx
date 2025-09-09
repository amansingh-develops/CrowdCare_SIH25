import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, AlertCircle, CheckCircle, UserCheck, UserX, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/api';

interface CameraCaptureProps {
  onCapture: (file: File, faceVerified?: boolean) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  showPreview?: boolean;
  facingMode?: 'user' | 'environment';
  enableFaceVerification?: boolean;
}

export function CameraCapture({
  onCapture,
  onError,
  className,
  disabled = false,
  showPreview = true,
  facingMode = 'environment',
  enableFaceVerification = true
}: CameraCaptureProps) {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [faceVerificationResult, setFaceVerificationResult] = useState<{
    verified: boolean;
    message: string;
  } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef(false);
  const { toast } = useToast();

  // Convert file to base64 for face verification
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }, []);

  // Verify face using the instant API
  const verifyFace = useCallback(async (file: File): Promise<boolean> => {
    if (!enableFaceVerification) return true;
    
    try {
      setIsVerifyingFace(true);
      const base64 = await fileToBase64(file);
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
  }, [enableFaceVerification, fileToBase64]);

  // Retry face verification
  const retryFaceVerification = useCallback(async () => {
    if (capturedFile) {
      const verified = await verifyFace(capturedFile);
      if (verified) {
        toast({
          title: 'Face verification successful',
          description: 'Human face verified on retry!'
        });
      }
    }
  }, [capturedFile, verifyFace, toast]);

  const startCamera = useCallback(async () => {
    if (isStartingRef.current || disabled) return;
    
    try {
      isStartingRef.current = true;
      setCameraError(null);
      setIsCameraReady(false);
      setIsLoading(true);
      
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element not found');
      }
      
      console.log('Requesting camera access...');
      
      // Request camera with better constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { 
          facingMode,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      });
      
      streamRef.current = stream;
      video.srcObject = stream;
      
      // Set video properties
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      
      // Wait for video to be ready
      return new Promise<void>((resolve, reject) => {
        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState
          });
          
          video.style.display = 'block';
          video.style.backgroundColor = 'transparent';
          
          video.play().then(() => {
            console.log('Video is playing');
            setIsCameraReady(true);
            setIsLoading(false);
            resolve();
          }).catch((playError) => {
            console.warn('Video play failed, but continuing:', playError);
            setIsCameraReady(true);
            setIsLoading(false);
            resolve();
          });
        };
        
        const handleError = (error: any) => {
          console.error('Video error:', error);
          reject(error);
        };
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        video.addEventListener('error', handleError, { once: true });
        
        // Fallback timeout
        setTimeout(() => {
          if (!isCameraReady) {
            console.log('Camera timeout - marking as ready anyway');
            setIsCameraReady(true);
            setIsLoading(false);
            resolve();
          }
        }, 3000);
      });
      
    } catch (err: any) {
      console.error('Camera error:', err);
      setIsLoading(false);
      const errorMsg = err?.message || 'Failed to access camera. Please allow camera permissions.';
      setCameraError(errorMsg);
      onError?.(errorMsg);
      setIsCameraReady(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [disabled, facingMode, isCameraReady, onError]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.style.display = 'none';
    }
    
    setIsCameraReady(false);
    setCameraError(null);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      toast({
        title: 'Camera not ready',
        description: 'Please wait for the camera to be ready before capturing.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsCapturing(true);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Get video dimensions
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, width, height);
      
      // Convert to blob
      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((b) => {
          resolve(b);
        }, 'image/jpeg', 0.9);
      });
      
      if (!blob) {
        throw new Error('Failed to capture image');
      }
      
      // Create file from blob
      const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });
      
      // Create preview URL
      const url = URL.createObjectURL(blob);
      setCapturedImage(url);
      setCapturedFile(file);
      
      // Verify face if enabled
      let faceVerified = true;
      if (enableFaceVerification) {
        faceVerified = await verifyFace(file);
        
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
      } else {
        toast({
          title: 'Photo captured',
          description: 'Photo captured successfully!'
        });
      }
      
      // Call the onCapture callback with verification result
      onCapture(file, faceVerified);
      
    } catch (err: any) {
      console.error('Capture error:', err);
      toast({
        title: 'Capture failed',
        description: err?.message || 'Failed to capture photo. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCapturing(false);
    }
  }, [isCameraReady, onCapture, toast]);

  const retakePhoto = useCallback(() => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedFile(null);
    setFaceVerificationResult(null);
  }, [capturedImage]);

  // Auto-start camera when component mounts
  useEffect(() => {
    if (!disabled) {
      startCamera();
    }
    
    // Cleanup on unmount
    return () => {
      stopCamera();
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, [disabled, startCamera, stopCamera, capturedImage]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Camera Preview */}
      <div className="relative w-full aspect-video bg-black/5 rounded-lg overflow-hidden border">
        {capturedImage && showPreview ? (
          <img
            src={capturedImage}
            alt="Captured photo"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ 
                backgroundColor: isCameraReady ? 'transparent' : '#000',
                display: isCameraReady ? 'block' : 'none'
              }}
            />
            
            {/* Loading indicator */}
            {(!isCameraReady || isLoading) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-white text-sm">
                    {isLoading ? 'Starting camera...' : 'Camera not ready'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Camera status indicator */}
            {isCameraReady && streamRef.current && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Error display */}
      {cameraError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800">{cameraError}</p>
          </div>
        </div>
      )}

      {/* Face verification status */}
      {enableFaceVerification && faceVerificationResult && (
        <div className={cn(
          "border rounded-lg p-3",
          faceVerificationResult.verified 
            ? "bg-green-50 border-green-200" 
            : "bg-yellow-50 border-yellow-200"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {faceVerificationResult.verified ? (
                <UserCheck className="w-4 h-4 text-green-600" />
              ) : (
                <UserX className="w-4 h-4 text-yellow-600" />
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-800">Verifying human face...</p>
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="flex gap-2 justify-center">
        {capturedImage ? (
          <>
            <Button
              onClick={retakePhoto}
              variant="outline"
              disabled={disabled}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button
              onClick={() => capturedFile && onCapture(capturedFile, faceVerificationResult?.verified)}
              disabled={disabled || isVerifyingFace}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isVerifyingFace ? 'Verifying...' : 'Use Photo'}
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={startCamera}
              variant="outline"
              disabled={disabled || isLoading}
            >
              {isLoading ? 'Starting...' : (isCameraReady ? 'Restart Camera' : 'Start Camera')}
            </Button>
            <Button
              onClick={capturePhoto}
              disabled={disabled || !isCameraReady || isCapturing}
            >
              <Camera className="w-4 h-4 mr-2" />
              {isCapturing ? 'Capturing...' : 'Capture Photo'}
            </Button>
          </>
        )}
      </div>
      
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
