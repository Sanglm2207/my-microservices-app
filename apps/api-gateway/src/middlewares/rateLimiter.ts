import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import config from '../config';
import logger from 'logger';

// Khởi tạo Redis client
const redisClient = createClient({
    url: config.redisUrl,
    // legacyMode: true,
});

redisClient.on('error', (err) => logger.error({ err }, 'Redis Client Error for Rate Limiter'));
redisClient.connect().catch(console.error);

// Tạo một store chung sử dụng Redis
const redisStore = new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
});

// Middleware Rate Limit chung cho tất cả các API
// Cho phép 100 request mỗi 15 phút cho mỗi IP
export const generalRateLimiter = rateLimit({
    store: redisStore,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true, // Gửi header `RateLimit-*` về cho client
    legacyHeaders: false,
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
});

// Middleware Rate Limit nghiêm ngặt hơn cho các endpoint nhạy cảm (đăng nhập, đăng ký, quên mật khẩu)
// Cho phép 5 request mỗi 1 phút cho mỗi IP
export const sensitiveActionRateLimiter = rateLimit({
    store: redisStore,
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts, please try again after a minute' },
});