import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
    port: process.env.PORT || 4003,
    nodeEnv: process.env.NODE_ENV,
    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        s3BucketName: process.env.AWS_S3_BUCKET_NAME,
        s3Region: process.env.AWS_S3_REGION,
    },
};

// Validate required environment variables
if (
    !config.aws.accessKeyId ||
    !config.aws.secretAccessKey ||
    !config.aws.s3BucketName ||
    !config.aws.s3Region
) {
    console.error('FATAL ERROR: Missing required AWS S3 environment variables.');
    process.exit(1);
}

export default config;