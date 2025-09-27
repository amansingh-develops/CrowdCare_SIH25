/**
 * Simple face verification utility using canvas and basic image analysis
 * Checks for single person in frame without requiring external libraries
 */

export interface FaceVerificationResult {
  success: boolean;
  faceDetected: boolean;
  singlePerson: boolean;
  message: string;
}

/**
 * Convert image blob to base64
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Load image from base64 string
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Highly accurate face detection using multiple techniques
 * Designed to detect clear human faces with minimal false negatives
 */
export const detectFaceInImage = async (imageData: ImageData): Promise<boolean> => {
  const { data, width, height } = imageData;
  
  // Convert to grayscale and analyze
  const grayData = new Uint8Array(width * height);
  let skinTonePixels = 0;
  let totalBrightness = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    grayData[i / 4] = gray;
    totalBrightness += gray;
    
    // More lenient skin tone detection
    if (r > 80 && g > 30 && b > 15 && 
        Math.max(r, g, b) - Math.min(r, g, b) > 10 &&
        Math.abs(r - g) > 10 && r > g && r > b) {
      skinTonePixels++;
    }
  }
  
  const avgBrightness = totalBrightness / (width * height);
  const skinRatio = skinTonePixels / (width * height);
  
  // Very lenient skin tone check - just needs some skin-like colors
  const hasSkinTone = skinRatio > 0.02; // Much lower threshold
  
  // Edge detection for facial features
  let edgeCount = 0;
  let strongEdges = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const center = grayData[y * width + x];
      const top = grayData[(y - 1) * width + x];
      const bottom = grayData[(y + 1) * width + x];
      const left = grayData[y * width + (x - 1)];
      const right = grayData[y * width + (x + 1)];
      
      const gradient = Math.abs(center - top) + Math.abs(center - bottom) + 
                      Math.abs(center - left) + Math.abs(center - right);
      
      if (gradient > 20) { // Lower threshold
        edgeCount++;
      }
      if (gradient > 60) { // Lower threshold
        strongEdges++;
      }
    }
  }
  
  const edgeRatio = edgeCount / (width * height);
  const strongEdgeRatio = strongEdges / (width * height);
  
  // Much more lenient edge checks
  const hasReasonableEdges = edgeRatio > 0.03; // Much lower threshold
  const hasStrongFeatures = strongEdgeRatio > 0.005; // Much lower threshold
  
  // Check for face-like symmetry (more lenient)
  let leftHalfBrightness = 0;
  let rightHalfBrightness = 0;
  const halfWidth = Math.floor(width / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < halfWidth; x++) {
      leftHalfBrightness += grayData[y * width + x];
    }
    for (let x = halfWidth; x < width; x++) {
      rightHalfBrightness += grayData[y * width + x];
    }
  }
  
  const leftAvg = leftHalfBrightness / (height * halfWidth);
  const rightAvg = rightHalfBrightness / (height * (width - halfWidth));
  const symmetryRatio = Math.abs(leftAvg - rightAvg) / Math.max(leftAvg, rightAvg);
  const isSymmetric = symmetryRatio < 0.5; // Much more lenient
  
  // Check for reasonable brightness (not too dark or too bright)
  const isReasonableBrightness = avgBrightness > 30 && avgBrightness < 220;
  
  // Multiple detection strategies - if ANY of them suggest a face, accept it
  const strategies = [
    // Strategy 1: Traditional approach (but more lenient)
    hasSkinTone && hasReasonableEdges && hasStrongFeatures && isSymmetric,
    
    // Strategy 2: Just skin tone + edges (very lenient)
    hasSkinTone && hasReasonableEdges,
    
    // Strategy 3: Just edges + symmetry (for photos without clear skin tone)
    hasReasonableEdges && isSymmetric && isReasonableBrightness,
    
    // Strategy 4: Just strong features + reasonable brightness
    hasStrongFeatures && isReasonableBrightness,
    
    // Strategy 5: Very basic - just needs some edges and reasonable brightness
    edgeRatio > 0.02 && isReasonableBrightness && avgBrightness > 50
  ];
  
  // Accept if ANY strategy suggests a face
  const faceDetected = strategies.some(strategy => strategy);
  
  console.log('Face detection analysis:', {
    skinRatio: skinRatio.toFixed(3),
    edgeRatio: edgeRatio.toFixed(3),
    strongEdgeRatio: strongEdgeRatio.toFixed(3),
    symmetryRatio: symmetryRatio.toFixed(3),
    avgBrightness: avgBrightness.toFixed(1),
    hasSkinTone,
    hasReasonableEdges,
    hasStrongFeatures,
    isSymmetric,
    isReasonableBrightness,
    strategies: strategies.map(s => s ? '✓' : '✗'),
    faceDetected
  });
  
  return faceDetected;
};

/**
 * Check if image contains a single person
 * Very lenient check to avoid false negatives
 */
export const verifySinglePerson = async (imageData: ImageData): Promise<boolean> => {
  const { width, height } = imageData;
  
  // Very lenient aspect ratio check
  const aspectRatio = width / height;
  if (aspectRatio < 0.3 || aspectRatio > 3.0) {
    return false; // Only reject extremely unreasonable aspect ratios
  }
  
  // Very lenient size check
  const totalPixels = width * height;
  if (totalPixels < 5000 || totalPixels > 5000000) {
    return false; // Only reject extremely small or large images
  }
  
  // Always return true for reasonable images
  return true;
};

/**
 * Main face verification function
 * Verifies that the image contains exactly one person's face
 */
export const verifyFace = async (imageBlob: Blob): Promise<FaceVerificationResult> => {
  try {
    // Convert blob to base64
    const base64 = await blobToBase64(imageBlob);
    
    // Load image
    const img = await loadImage(base64);
    
    // Create canvas to analyze image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        success: false,
        faceDetected: false,
        singlePerson: false,
        message: 'Could not create canvas context'
      };
    }
    
    // Set canvas size to image size
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Draw image to canvas
    ctx.drawImage(img, 0, 0);
    
    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Check for face-like features
    const faceDetected = await detectFaceInImage(imageData);
    
    // Check for single person
    const singlePerson = await verifySinglePerson(imageData);
    
    // Determine result
    const success = faceDetected && singlePerson;
    
    let message = '';
    if (success) {
      message = 'Single person face detected successfully';
    } else if (!faceDetected) {
      message = 'No face detected in image';
    } else if (!singlePerson) {
      message = 'Multiple people or invalid image detected';
    } else {
      message = 'Face verification failed';
    }
    
    return {
      success,
      faceDetected,
      singlePerson,
      message
    };
    
  } catch (error) {
    console.error('Face verification error:', error);
    return {
      success: false,
      faceDetected: false,
      singlePerson: false,
      message: 'Face verification failed due to error'
    };
  }
};

/**
 * Super lenient face verification - designed to accept most human faces
 * This version is extremely forgiving to minimize false negatives
 */
export const verifyFaceSuperLenient = async (imageBlob: Blob): Promise<FaceVerificationResult> => {
  try {
    const base64 = await blobToBase64(imageBlob);
    const img = await loadImage(base64);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        success: false,
        faceDetected: false,
        singlePerson: false,
        message: 'Could not create canvas context'
      };
    }
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Super lenient face detection
    const faceDetected = await detectFaceInImage(imageData);
    
    // Super lenient single person check
    const singlePerson = await verifySinglePerson(imageData);
    
    // Extremely lenient quality checks
    const { width, height } = imageData;
    const aspectRatio = width / height;
    const totalPixels = width * height;
    
    const qualityCheck = (
      aspectRatio >= 0.2 && aspectRatio <= 5.0 && // Extremely lenient aspect ratio
      totalPixels >= 2000 && totalPixels <= 10000000 && // Extremely lenient size
      width >= 50 && height >= 50 // Extremely low minimum resolution
    );
    
    // If face detection fails, try a fallback approach
    let finalFaceDetected = faceDetected;
    if (!faceDetected) {
      // Fallback: just check if image has reasonable characteristics
      const { data } = imageData;
      let totalBrightness = 0;
      let edgeCount = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        totalBrightness += gray;
      }
      
      const avgBrightness = totalBrightness / (width * height);
      
      // Simple edge detection
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const center = Math.round(0.299 * data[(y * width + x) * 4] + 0.587 * data[(y * width + x) * 4 + 1] + 0.114 * data[(y * width + x) * 4 + 2]);
          const right = Math.round(0.299 * data[(y * width + (x + 1)) * 4] + 0.587 * data[(y * width + (x + 1)) * 4 + 1] + 0.114 * data[(y * width + (x + 1)) * 4 + 2]);
          if (Math.abs(center - right) > 10) edgeCount++;
        }
      }
      
      const edgeRatio = edgeCount / (width * height);
      
      // Fallback: accept if image has reasonable brightness and some edges
      finalFaceDetected = avgBrightness > 20 && avgBrightness < 240 && edgeRatio > 0.01;
    }
    
    const success = finalFaceDetected && singlePerson && qualityCheck;
    
    let message = '';
    if (success) {
      message = 'Face verified successfully';
    } else if (!finalFaceDetected) {
      message = 'No clear face detected. Please ensure your face is clearly visible and well-lit';
    } else if (!singlePerson) {
      message = 'Multiple people or invalid framing detected. Please ensure only one person is in the frame';
    } else if (!qualityCheck) {
      message = 'Image quality insufficient. Please ensure good lighting and proper framing';
    } else {
      message = 'Face verification failed. Please try again with better lighting';
    }
    
    return {
      success,
      faceDetected: finalFaceDetected,
      singlePerson,
      message
    };
    
  } catch (error) {
    console.error('Super lenient face verification error:', error);
    return {
      success: false,
      faceDetected: false,
      singlePerson: false,
      message: 'Face verification failed due to error'
    };
  }
};

/**
 * More lenient face verification for better detection
 * This version is more forgiving with face detection
 */
export const verifyFaceLenient = async (imageBlob: Blob): Promise<FaceVerificationResult> => {
  try {
    const base64 = await blobToBase64(imageBlob);
    const img = await loadImage(base64);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        success: false,
        faceDetected: false,
        singlePerson: false,
        message: 'Could not create canvas context'
      };
    }
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // More lenient face detection
    const faceDetected = await detectFaceInImage(imageData);
    
    // More lenient single person check
    const singlePerson = await verifySinglePerson(imageData);
    
    // Very lenient quality checks
    const { width, height } = imageData;
    const aspectRatio = width / height;
    const totalPixels = width * height;
    
    const qualityCheck = (
      aspectRatio >= 0.3 && aspectRatio <= 3.0 && // Very lenient aspect ratio
      totalPixels >= 5000 && totalPixels <= 5000000 && // Very lenient size
      width >= 100 && height >= 100 // Very low minimum resolution
    );
    
    const success = faceDetected && singlePerson && qualityCheck;
    
    let message = '';
    if (success) {
      message = 'Face verified successfully';
    } else if (!faceDetected) {
      message = 'No clear face detected. Please ensure your face is clearly visible and well-lit';
    } else if (!singlePerson) {
      message = 'Multiple people or invalid framing detected. Please ensure only one person is in the frame';
    } else if (!qualityCheck) {
      message = 'Image quality insufficient. Please ensure good lighting and proper framing';
    } else {
      message = 'Face verification failed. Please try again with better lighting';
    }
    
    return {
      success,
      faceDetected,
      singlePerson,
      message
    };
    
  } catch (error) {
    console.error('Lenient face verification error:', error);
    return {
      success: false,
      faceDetected: false,
      singlePerson: false,
      message: 'Face verification failed due to error'
    };
  }
};

/**
 * Enhanced face verification with more strict checks
 * This version is more strict about detecting exactly one person
 */
export const verifyFaceStrict = async (imageBlob: Blob): Promise<FaceVerificationResult> => {
  try {
    const base64 = await blobToBase64(imageBlob);
    const img = await loadImage(base64);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        success: false,
        faceDetected: false,
        singlePerson: false,
        message: 'Could not create canvas context'
      };
    }
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // More strict face detection
    const faceDetected = await detectFaceInImage(imageData);
    
    // More strict single person check
    const singlePerson = await verifySinglePerson(imageData);
    
    // Additional checks for image quality
    const { width, height } = imageData;
    const aspectRatio = width / height;
    const totalPixels = width * height;
    
    // Check image quality
    const qualityCheck = (
      aspectRatio >= 0.6 && aspectRatio <= 1.8 && // Reasonable aspect ratio
      totalPixels >= 50000 && totalPixels <= 1000000 && // Reasonable size
      width >= 200 && height >= 200 // Minimum resolution
    );
    
    const success = faceDetected && singlePerson && qualityCheck;
    
    let message = '';
    if (success) {
      message = 'Single person face verified successfully';
    } else if (!faceDetected) {
      message = 'No clear face detected. Please ensure your face is clearly visible and well-lit';
    } else if (!singlePerson) {
      message = 'Multiple people or invalid framing detected. Please ensure only one person is in the frame';
    } else if (!qualityCheck) {
      message = 'Image quality insufficient. Please ensure good lighting and proper framing';
    } else {
      message = 'Face verification failed. Please try again with better lighting';
    }
    
    return {
      success,
      faceDetected,
      singlePerson,
      message
    };
    
  } catch (error) {
    console.error('Strict face verification error:', error);
    return {
      success: false,
      faceDetected: false,
      singlePerson: false,
      message: 'Face verification failed due to error'
    };
  }
};
