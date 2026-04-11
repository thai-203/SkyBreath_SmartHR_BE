import { BadRequestException } from '../common/exceptions/index.js';
import fs from 'fs';
import { cloudinary } from '../config/cloudinary.config.js';
import { config } from '../config/env.config.js';

export class UploadController {
  async uploadImage(req, res, next) {
    const tempFilePath = req.file?.path;
    try {
      if (!req.file) {
        throw new BadRequestException('No file uploaded or invalid file type');
      }

      if (
        !config.cloudinary.cloudName ||
        !config.cloudinary.apiKey ||
        !config.cloudinary.apiSecret
      ) {
        throw new BadRequestException('Cloudinary is not configured');
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: config.cloudinary.folder,
        resource_type: 'image',
      });

      const fileUrl = result.secure_url;

      res.status(200).json({
        message: 'Image uploaded successfully',
        data: {
          url: fileUrl,
        },
      });
    } catch (error) {
      next(error);
    } finally {
      if (tempFilePath) {
        await fs.promises.unlink(tempFilePath).catch(() => {});
      }
    }
  }
}
