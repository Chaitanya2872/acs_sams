const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

class FileUploadService {
    // Upload single image to Cloudinary
    async uploadImage(fileInput, options = {}) {
        return new Promise((resolve, reject) => {
          const uploadOptions = {
            folder: options.folder || 'sams/structures',
            resource_type: 'image',
            transformation: [
              { width: 1200, height: 800, crop: 'limit' },
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ],
            ...options
          };
      
          const callback = (error, result) => {
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              size: result.bytes
            });
          };
      
          if (Buffer.isBuffer(fileInput)) {
            // memoryStorage
            const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, callback);
            streamifier.createReadStream(fileInput).pipe(uploadStream);
          } else if (typeof fileInput === 'string') {
            // diskStorage (fileInput is file.path)
            cloudinary.uploader.upload(fileInput, uploadOptions, callback);
          } else {
            reject(new Error('Invalid file input for uploadImage'));
          }
        });
      }
      

    // Upload multiple images
    async uploadMultipleImages(files, options = {}) {
        const uploadPromises = files.map(file => {
          const fileData = file.buffer || file.path;  // <-- support both
      
          return this.uploadImage(fileData, {
            folder: options.folder || 'sams/structures',
            public_id: options.prefix
              ? `${options.prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`
              : undefined
          });
        });
      
        try {
          return await Promise.all(uploadPromises);
        } catch (error) {
          throw new Error(`Failed to upload images: ${error.message}`);
        }
      }
      

    // Delete image from Cloudinary
    async deleteImage(publicId) {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            return result;
        } catch (error) {
            throw new Error(`Failed to delete image: ${error.message}`);
        }
    }

    // Delete multiple images
    async deleteMultipleImages(publicIds) {
        try {
            const result = await cloudinary.api.delete_resources(publicIds);
            return result;
        } catch (error) {
            throw new Error(`Failed to delete images: ${error.message}`);
        }
    }

    // Get image info
    async getImageInfo(publicId) {
        try {
            const result = await cloudinary.api.resource(publicId);
            return {
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                size: result.bytes,
                format: result.format,
                createdAt: result.created_at
            };
        } catch (error) {
            throw new Error(`Failed to get image info: ${error.message}`);
        }
    }

    // Generate optimized URL
    generateOptimizedUrl(publicId, options = {}) {
        return cloudinary.url(publicId, {
            transformation: [
                { width: options.width || 800, height: options.height || 600, crop: 'limit' },
                { quality: options.quality || 'auto' },
                { fetch_format: 'auto' }
            ]
        });
    }
}

module.exports = new FileUploadService();