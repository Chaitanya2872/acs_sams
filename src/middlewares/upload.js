const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const DOC_FORMATS = ['pdf', 'xls', 'xlsx', 'doc', 'docx'];

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    return {
      folder: 'sams-structures',
      resource_type: isImage ? 'image' : 'raw',
      allowed_formats: isImage ? IMAGE_FORMATS : DOC_FORMATS,
      ...(isImage
        ? {
            transformation: [
              { width: 1024, height: 1024, crop: 'limit', quality: 'auto' },
            ],
          }
        : {}),
    };
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().replace('.', '');
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    const isDoc = DOC_FORMATS.includes(ext);

    if (isImage || isDoc) {
      cb(null, true);
    } else {
      cb(new Error('Only image, PDF, or Excel files are allowed'), false);
    }
  }
});

// Accept up to 8 files under 'photo'/'photos' for images and 'docs' for documents.
// Flutter sends files as 'photo'; use either in Postman.
// upload.fields() populates req.files as:
//   { photo: [file, file, ...], photos: [file, ...] }
// The controller merges both arrays via req.files['photo'] and req.files['photos'].
const uploadMultiple = upload.fields([
  { name: 'photo', maxCount: 8 },
  { name: 'photos', maxCount: 8 },
  { name: 'docs', maxCount: 8 },
]);

const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 8 images per field'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: `Unexpected file field "${error.field}". Use "photo" or "photos" as the field name`
      });
    }
  }

  if (error.message === 'Only image, PDF, or Excel files are allowed') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

module.exports = {
  uploadSingle: upload.single('photo'),
  uploadMultiple,
  handleUploadError
};
