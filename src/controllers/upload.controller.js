import { BadRequestException } from '../common/exceptions/index.js';

export class UploadController {
    uploadImage(req, res, next) {
        try {
            if (!req.file) {
                throw new BadRequestException('No file uploaded or invalid file type');
            }
            // Generate full URL internally based on the host if needed,
            // or return relative path for Frontend to resolve.
            // Currently Express is mapped: app.use('/uploads', express.static(...))
            const fileUrl = `/uploads/${req.file.filename}`;
            
            res.status(200).json({
                message: 'Image uploaded successfully',
                data: {
                    url: fileUrl
                }
            });
        } catch (error) {
            next(error);
        }
    }
}
