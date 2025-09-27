import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
    port: process.env.PORT || 4001,
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL as string,
    redisUrl: process.env.REDIS_URL as string,
    jwt: {
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET as string,
        refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET as string,
        accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
        refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    },
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rabbitmqUrl: process.env.RABBITMQ_URL as string,
    twoFactorEncryptionKey: process.env.TWO_FACTOR_ENCRYPTION_KEY as string,
};

// Validate essential config
if (!config.databaseUrl || !config.jwt.accessTokenSecret || !config.jwt.refreshTokenSecret) {
    throw new Error('FATAL ERROR: Missing essential environment variables.');
}

export default config;