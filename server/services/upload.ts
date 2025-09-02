import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Configure multer for image uploads
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export interface UploadedFile {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export async function saveUploadedFile(
  file: Express.Multer.File,
  subDirectory: string = 'issues'
): Promise<UploadedFile> {
  try {
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', subDirectory);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname);
    const fileName = `${timestamp}_${randomString}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    await writeFile(filePath, file.buffer);

    return {
      fileName,
      filePath: path.join(subDirectory, fileName),
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  } catch (error) {
    console.error('Error saving uploaded file:', error);
    throw new Error('Failed to save uploaded file');
  }
}

export function getFileUrl(filePath: string): string {
  return `/uploads/${filePath}`;
}

// Extract EXIF data from image
export async function extractExifData(buffer: Buffer): Promise<{
  latitude?: number;
  longitude?: number;
  timestamp?: Date;
  camera?: string;
}> {
  try {
    // This would typically use a library like 'exif-parser' or 'piexifjs'
    // For now, returning a placeholder structure
    
    // Basic EXIF extraction would go here
    // const exif = exifParser.create(buffer).parse();
    
    return {
      // latitude: exif.tags?.GPSLatitude,
      // longitude: exif.tags?.GPSLongitude,
      // timestamp: exif.tags?.DateTime ? new Date(exif.tags.DateTime) : undefined,
      // camera: exif.tags?.Model,
    };
  } catch (error) {
    console.error('Error extracting EXIF data:', error);
    return {};
  }
}

// Convert image to base64 for AI analysis
export function imageToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}
