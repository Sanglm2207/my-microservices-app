import jwt from 'jsonwebtoken';
import { JWTPayload } from 'common-types';

/**
 * Hàm này đọc ACCESS_TOKEN_SECRET từ process.env.
 * Biến này phải được thiết lập bởi service sử dụng package này (ví dụ: api-gateway).
 */
const getAccessTokenSecret = (): string => {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
        console.error('ACCESS_TOKEN_SECRET is not defined in environment variables.');
        throw new Error('Missing JWT secret');
    }
    return secret;
};

/**
 * Xác thực một access token.
 * @param token - Chuỗi JWT cần xác thực.
 * @returns - Payload đã được giải mã nếu token hợp lệ.
 * @throws - Lỗi nếu token không hợp lệ hoặc hết hạn.
 */
export const verifyToken = (token: string): JWTPayload => {
    return jwt.verify(token, getAccessTokenSecret()) as JWTPayload;
};