import Redis from 'ioredis';

// Đọc Redis URL từ biến môi trường của service đang gọi
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.warn('REDIS_URL is not defined, cache functionality will be disabled.');
}

// Chỉ khởi tạo client nếu có URL
// Dùng lazy initialization để tránh lỗi khi REDIS_URL không tồn tại
let redisClientInstance: Redis | null = null;

const getRedisClient = () => {
    if (!redisUrl) {
        // Trả về một đối tượng giả mạo nếu không có Redis, để code không bị lỗi
        // Các hàm sẽ không làm gì cả
        return {
            get: async () => null,
            set: async () => 'OK',
            on: () => { },
        } as unknown as Redis;
    }

    if (!redisClientInstance) {
        redisClientInstance = new Redis(redisUrl, {
            maxRetriesPerRequest: null, // Tự động kết nối lại vô hạn
        });
        redisClientInstance.on('error', (err) => console.error('Redis Client Error', err));
        redisClientInstance.on('connect', () => console.log('Connected to Redis successfully.'));
    }

    return redisClientInstance;
}

export const redisClient = getRedisClient();