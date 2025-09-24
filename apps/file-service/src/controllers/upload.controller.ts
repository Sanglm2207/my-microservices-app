import { Request, Response, NextFunction } from 'express';
import logger from 'logger';
import { processAndUploadToS3 } from '../services/upload.service';

export const handleAvatarUpload = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { originalUrl, thumbnailUrl } = await processAndUploadToS3(req);

        logger.info({ userId: req.headers['x-user-id'], originalUrl }, 'Avatar uploaded successfully');

        res.status(201).json({
            message: 'File uploaded successfully!',
            originalUrl,
            thumbnailUrl,
        });
    } catch (error) {
        // Chuyển lỗi đến errorHandler chung
        next(error);
    }
};