const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    // Non-image documents are stored as Cloudinary "raw" assets. Without a `format` here,
    // Cloudinary gives the asset no file extension at all (and a generic
    // application/octet-stream content-type), so a downloaded document has no way to tell
    // the OS what kind of file it is and won't open. Tagging the original extension fixes
    // that; see reports.js's document-download proxy for why the resulting URL still needs
    // to be resolved through Cloudinary's signed Admin API rather than fetched directly.
    const extension = path.extname(file.originalname || '').replace(/^\./, '').toLowerCase();
    return {
      folder: 'sams-structures',
      resource_type: isImage ? 'image' : 'raw',
      ...(isImage
        ? {
            transformation: [
              { width: 1024, height: 1024, crop: 'limit', quality: 'auto' },
            ],
          }
        : (extension ? { format: extension } : {})),
    };
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
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

  next(error);
};

module.exports = {
  uploadSingle: upload.single('photo'),
  uploadMultiple,
  handleUploadError
};
