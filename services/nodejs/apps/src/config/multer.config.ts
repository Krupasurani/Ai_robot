import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || '/tmp/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Disk storage configuration - saves memory
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Add your file type validations here
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

// Create multer instance with disk storage
export const createDiskUpload = (options?: {
  maxFileSize?: number;
  maxFiles?: number;
}) => {
  return multer({
    storage: diskStorage,
    limits: {
      fileSize: options?.maxFileSize || 10 * 1024 * 1024, // 10MB default
      files: options?.maxFiles || 1,
    },
    fileFilter,
  });
};

// For small files that can stay in memory (like JSON configs)
export const createMemoryUpload = (options?: {
  maxFileSize?: number;
  maxFiles?: number;
}) => {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: options?.maxFileSize || 1 * 1024 * 1024, // 1MB max for memory
      files: options?.maxFiles || 1,
    },
    fileFilter,
  });
};

// Cleanup function for temporary files
export const cleanupTempFile = async (filePath: string): Promise<void> => {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.error('Error cleaning up temp file:', error);
  }
};

// Export default disk upload
export default createDiskUpload(); 