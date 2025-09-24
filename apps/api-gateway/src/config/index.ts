import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
    port: process.env.PORT || 4000,
    nodeEnv: process.env.NODE_ENV || 'development',
    services: {
        auth: process.env.AUTH_SERVICE_URL as string,
        user: process.env.USER_SERVICE_URL as string,
        file: process.env.FILE_SERVICE_URL as string,
    },
    jwt: {
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET as string,
    },
    redisUrl: process.env.REDIS_URL as string,
    corsOrigin: process.env.CORS_ORIGIN || '*',
};

if (!config.services.auth || !config.services.user || !config.jwt.accessTokenSecret) {
    throw new Error('FATAL ERROR: Missing essential environment variables for API Gateway.');
}

if (!config.redisUrl) {
    throw new Error('FATAL ERROR: REDIS_URL is not defined for API Gateway.');
}

// Cập nhật lại ACCESS_TOKEN_SECRET trong process.env để package 'auth-client' có thể đọc được
process.env.ACCESS_TOKEN_SECRET = config.jwt.accessTokenSecret;

export default config;