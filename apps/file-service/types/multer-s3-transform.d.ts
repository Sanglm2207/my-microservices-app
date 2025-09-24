import { Options as MulterS3Options } from 'multer-s3';
import { Request } from 'express';
import { S3Client } from '@aws-sdk/client-s3';

declare module 'multer-s3-transform' {
    interface TransformFn {
        (req: Request, file: Express.Multer.File, callback: (error: any, stream?: NodeJS.ReadableStream) => void): void;
    }
    interface KeyFn {
        (req: Request, file: Express.Multer.File, callback: (error: any, key?: string) => void): void;
    }
    interface TransformOptions {
        id: string;
        key: KeyFn;
        transform: TransformFn;
    }

    interface CustomOptions extends Omit<MulterS3Options, 's3'> {
        s3: S3Client;
        shouldTransform?: boolean | ((req: Request, file: Express.Multer.File, callback: (error: any, done?: boolean) => void) => void);
        transforms?: TransformOptions[];
    }

    function s3Storage(options: CustomOptions): any;

    namespace s3Storage {
        function AUTO_CONTENT_TYPE(req: Request, file: Express.Multer.File, callback: (error: any, mime?: string, body?: Buffer) => void): void;
    }

    export = s3Storage;
}