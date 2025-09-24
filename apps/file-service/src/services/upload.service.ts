import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import multer from 'multer';
import sharp from 'sharp';
import config from '../config';
import { Request } from 'express';

// 1. Cấu hình S3Client cho AWS SDK v3 (Giữ nguyên)
const s3Client = new S3Client({
    region: config.aws.s3Region,
    credentials: {
        accessKeyId: config.aws.accessKeyId!,
        secretAccessKey: config.aws.secretAccessKey!,
    },
});

// 2. Cấu hình Multer để lưu file vào bộ nhớ
const storage = multer.memoryStorage();

// Hàm kiểm tra loại file
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type, only images are allowed!'));
    }
};

// Middleware Multer cơ bản
export const multerUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5, // 5MB
    }
});

// 3. Hàm xử lý và upload lên S3
export const processAndUploadToS3 = async (req: Request) => {
    if (!req.file) {
        throw new Error('No file uploaded.');
    }

    const userId = req.headers['x-user-id'] || 'unknown-user';
    const originalName = req.file.originalname;
    const timestamp = Date.now();

    // Xử lý ảnh gốc
    const originalBuffer = await sharp(req.file.buffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

    const originalKey = `avatars/${userId}/original/${timestamp}_${originalName}`;

    // Xử lý ảnh thumbnail
    const thumbnailBuffer = await sharp(req.file.buffer)
        .resize(200, 200)
        .jpeg({ quality: 80 })
        .toBuffer();

    const thumbnailKey = `avatars/${userId}/thumbnail/${timestamp}_${originalName}`;

    // Hàm để upload một buffer lên S3
    const uploadToS3 = async (key: string, buffer: Buffer, mimetype: string) => {
        try {
            const uploader = new Upload({
                client: s3Client,
                params: {
                    Bucket: config.aws.s3BucketName,
                    Key: key,
                    Body: buffer,
                    ACL: 'public-read',
                    ContentType: mimetype,
                },
            });
            const result = await uploader.done();
            return result.Location;
        } catch (error) {
            console.error(`Failed to upload ${key} to S3`, error);
            throw error;
        }
    };

    // Thực hiện upload song song
    const [originalUrl, thumbnailUrl] = await Promise.all([
        uploadToS3(originalKey, originalBuffer, req.file.mimetype),
        uploadToS3(thumbnailKey, thumbnailBuffer, req.file.mimetype),
    ]);

    return { originalUrl, thumbnailUrl };
};