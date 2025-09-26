/**
 * Dành cho User Profile trong user-service (MongoDB).
 * ID sẽ khớp với ID trong auth-service.
 */
export interface User {
    _id: string; // Trong Mongoose, _id là mặc định
    email: string;
    name?: string;
    avatar?: string;
    bio?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Payload được mã hóa bên trong JWT.
 */
export interface JWTPayload {
    userId: string;
    role: 'USER' | 'ADMIN';
    email: string;
}

/**
 * Cấu trúc body của request đăng nhập.
 */
export interface LoginRequestBody {
    email: string;
    password: string;
}

/**
 * Cấu trúc body của request đăng ký.
 */
export interface RegisterRequestBody {
    email: string;
    password: string;
    name?: string;
    status: 'PENDING' | 'ACTIVE' | 'FAILED'; // Trạng thái đăng ký
}