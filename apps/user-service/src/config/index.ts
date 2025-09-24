import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Định nghĩa và export các biến cấu hình
const config = {
    port: process.env.PORT || 4002,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGO_URI as string,
    redisUrl: process.env.REDIS_URL as string,
    // Lấy địa chỉ của client được phép truy cập (API Gateway)
    corsOrigin: process.env.CORS_ORIGIN || '*',

    // api internal
    authServiceInternalUrl: process.env.AUTH_SERVICE_INTERNAL_URL as string,
};

// Kiểm tra các biến môi trường quan trọng. Nếu thiếu, dừng server ngay lập tức.
if (!config.mongoUri) {
    console.error('FATAL ERROR: MONGO_URI is not defined in the environment variables for user-service.');
    process.exit(1); // Thoát tiến trình với mã lỗi
}

if (!config.redisUrl) {
    console.error('FATAL ERROR: REDIS_URL is not defined in the environment variables for user-service.');
    process.exit(1); // Thoát tiến trình với mã lỗi
}

process.env.REDIS_URL = config.redisUrl;


export default config;