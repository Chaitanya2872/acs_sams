const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Mobile-optimized file upload configuration
const mobileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/mobile');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Mobile-friendly filename with timestamp
    const timestamp = Date.now();
    const userId = req.user?.id || 'anonymous';
    const extension = path.extname(file.originalname);
    
    // Format: mobile_userId_timestamp_originalname
    const filename = `mobile_${userId}_${timestamp}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}${extension}`;
    cb(null, filename);
  }
});

// Mobile file filter - optimized for tablet camera uploads
const mobileFileFilter = (req, file, cb) => {
  // Accept images and common document formats from mobile
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp', // Common mobile format
    'image/heic', // iOS format
    'image/heif', // iOS format
    'application/pdf'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not supported. Please use JPEG, PNG, WebP, or PDF`), false);
  }
};

// Mobile upload configuration
const mobileUpload = multer({
  storage: mobileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for mobile (larger than web due to camera quality)
    files: 8 // Maximum 8 files per upload
  },
  fileFilter: mobileFileFilter
});

/**
 * Mobile single file upload
 */
const uploadMobileSingle = (fieldName = 'image') => {
  return (req, res, next) => {
    const singleUpload = mobileUpload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Image too large. Please compress or use a smaller image (max 10MB)',
            mobile: true,
            errorCode: 'FILE_TOO_LARGE'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
          mobile: true,
          errorCode: 'UPLOAD_ERROR'
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
          mobile: true,
          errorCode: 'FILE_TYPE_ERROR'
        });
      }
      
      // Add mobile-specific file info
      if (req.file) {
        req.file.mobile = true;
        req.file.uploadedAt = new Date().toISOString();
        req.file.userId = req.user?.id;
      }
      
      next();
    });
  };
};

/**
 * Mobile multiple files upload
 */
const uploadMobileMultiple = (fieldName = 'images', maxCount = 8) => {
  return (req, res, next) => {
    const multipleUpload = mobileUpload.array(fieldName, maxCount);
    
    multipleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'One or more images are too large. Please compress images (max 10MB each)',
            mobile: true,
            errorCode: 'FILE_TOO_LARGE'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: `Too many files. Maximum ${maxCount} images allowed`,
            mobile: true,
            errorCode: 'TOO_MANY_FILES'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
          mobile: true,
          errorCode: 'UPLOAD_ERROR'
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
          mobile: true,
          errorCode: 'FILE_TYPE_ERROR'
        });
      }
      
      // Add mobile-specific info to all files
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          file.mobile = true;
          file.uploadedAt = new Date().toISOString();
          file.userId = req.user?.id;
        });
      }
      
      next();
    });
  };
};

/**
 * Mobile image compression middleware
 */
const compressForMobile = (req, res, next) => {
  // This would integrate with image processing
  // For now, just add metadata for compression
  if (req.file) {
    req.file.requiresCompression = req.file.size > 2 * 1024 * 1024; // 2MB threshold
  }
  
  if (req.files) {
    req.files.forEach(file => {
      file.requiresCompression = file.size > 2 * 1024 * 1024;
    });
  }
  
  next();
};

/**
 * Mobile upload validation
 */
const validateMobileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      success: false,
      message: 'No images uploaded',
      mobile: true,
      errorCode: 'NO_FILES'
    });
  }
  
  next();
};

/**
 * Mobile file cleanup on error
 */
const mobileUploadErrorHandler = (err, req, res, next) => {
  // Clean up uploaded files if there's an error
  const cleanupFile = (file) => {
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        console.log(`Cleaned up mobile file: ${file.path}`);
      } catch (cleanupError) {
        console.error(`Failed to cleanup mobile file ${file.path}:`, cleanupError);
      }
    }
  };

  if (req.file) {
    cleanupFile(req.file);
  }
  
  if (req.files && Array.isArray(req.files)) {
    req.files.forEach(cleanupFile);
  }
  
  next(err);
};

module.exports = {
  uploadMobileSingle,
  uploadMobileMultiple,
  compressForMobile,
  validateMobileUpload,
  mobileUploadErrorHandler
};