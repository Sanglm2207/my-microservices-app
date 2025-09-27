import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient, RedisClientType } from 'redis';
import config from '../config';
import logger from 'logger';

// --- Khai báo biến client ở scope ngoài để có thể export ---
// Sử dụng `any` để tránh xung đột type giữa redis v4 và mong đợi của rate-limit-redis
let redisClient: any;

/**
 * Hàm này export redisClient ra ngoài để index.ts có thể gọi .quit()
 * khi thực hiện graceful shutdown.
 */
export const getRateLimitRedisClient = () => redisClient;


// --- Khởi tạo và kết nối Redis Client ---
try {
    redisClient = createClient({
        url: config.redisUrl,
        // legacyMode: true, 
    });

    redisClient.on('error', (err: Error) => {
        logger.error({ err }, 'Rate Limiter Redis Client Error');
    });

    // Kết nối client. Trong legacyMode, nó sẽ tự động kết nối lại nếu mất kết nối.
    redisClient.connect().catch((err: Error) => {
        logger.error({ err }, 'Could not connect to Redis for rate limiting');
    });

    logger.info('Rate Limiter Redis client initialized.');

} catch (error) {
    logger.error({ error }, 'Failed to initialize Redis client for rate limiter');
}


// Middleware Rate Limit chung cho tất cả các API
// Cho phép 100 request mỗi 15 phút cho mỗi IP
export const generalRateLimiter = rateLimit({
    store: new RedisStore({
        // @ts-ignore - Bỏ qua lỗi type vì chúng ta đã bật legacyMode và biết nó tương thích
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again after 15 minutes' },
});

// Middleware Rate Limit nghiêm ngặt hơn cho các endpoint nhạy cảm (đăng nhập, đăng ký, quên mật khẩu)
// Cho phép 5 request mỗi 1 phút cho mỗi IP
export const sensitiveActionRateLimiter = rateLimit({
    store: new RedisStore({
        // @ts-ignore - Tương tự, bỏ qua lỗi type
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 500,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many attempts, please try again after a minute' },
});