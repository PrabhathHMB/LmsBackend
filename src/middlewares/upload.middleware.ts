import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ApiError } from '../utils/api-error.utils';
import { ENV } from '../config/env';

const uploadDirectory = path.resolve(process.cwd(), ENV.UPLOAD_DIR);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = /jpeg|jpg|png|webp|gif|pdf|doc|docx|ppt|pptx|zip|mp4/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  
  if (allowedExtensions.test(ext)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`File type not allowed. Supported types: ${allowedExtensions}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max limit
  },
});
