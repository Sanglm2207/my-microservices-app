import { prisma, User, Role } from 'database';
import { redisClient } from 'cache';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';
import { LoginRequestBody, RegisterRequestBody } from 'common-types';
import { publishPasswordResetRequestedEvent, publishUserRegisteredEvent } from 'message-producer';
import { randomBytes } from 'crypto';

/**
 * Đăng ký người dùng mới
 */
export const registerUser = async (
    userData: RegisterRequestBody
): Promise<Omit<User, 'password'>> => {
    const { email, password, name } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
        data: { email, password: hashedPassword, name },
    });

    await publishUserRegisteredEvent({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
};

/**
 * Xác thực thông tin đăng nhập của người dùng
 */
export const validateUser = async (
    credentials: LoginRequestBody
): Promise<User | null> => {
    const user = await prisma.user.findUnique({
        where: { email: credentials.email },
    });

    if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
        return null;
    }
    return user;
};

/**
 * Tạo Access Token và Refresh Token
 */
export const generateTokens = (user: User) => {
    const accessTokenPayload = { userId: user.id, role: user.role, email: user.email };
    const refreshTokenPayload = { userId: user.id, version: user.tokenVersion };

    const accessToken = jwt.sign(accessTokenPayload, config.jwt.accessTokenSecret, {
        expiresIn: config.jwt.accessTokenExpiresIn,
    });
    const refreshToken = jwt.sign(refreshTokenPayload, config.jwt.refreshTokenSecret, {
        expiresIn: config.jwt.refreshTokenExpiresIn,
    });
    return { accessToken, refreshToken };
};

/**
 * Xác thực Refresh Token và kiểm tra trong blacklist
 */
export const verifyAndGetUserFromRefreshToken = async (
    token: string
): Promise<User | null> => {
    try {
        // Kiểm tra xem token có trong blacklist không
        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        if (isBlacklisted) {
            return null;
        }

        const payload = jwt.verify(
            token,
            config.jwt.refreshTokenSecret
        ) as { userId: string; version: number };

        const user = await prisma.user.findUnique({ where: { id: payload.userId } });

        if (!user || user.tokenVersion !== payload.version) {
            return null;
        }

        return user;
    } catch (error) {
        return null;
    }
};

/**
 * Thêm một token vào danh sách đen (blacklist) trong Redis
 */
export const blacklistRefreshToken = async (token: string) => {
    try {
        const decoded = jwt.decode(token) as { exp: number };
        if (!decoded || !decoded.exp) {
            return;
        }
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
            // Chỉ lưu vào blacklist nếu token chưa hết hạn
            await redisClient.set(`blacklist:${token}`, 'true', 'EX', expiresIn);
        }
    } catch (error) {
        console.error('Error blacklisting token:', error);
    }
};

export const requestPasswordReset = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        // Vẫn trả về thành công để tránh lộ thông tin
        return;
    }

    const resetToken = randomBytes(32).toString('hex');
    const tokenHash = resetToken; // Trong production nên hash token này nữa

    // Lưu token vào Redis với TTL 15 phút (900 giây)
    await redisClient.set(`reset:${tokenHash}`, user.id, 'EX', 900);

    // Bắn sự kiện
    await publishPasswordResetRequestedEvent({
        email: user.email,
        name: user.name,
        resetToken: tokenHash,
    });
};

export const resetPassword = async (token: string, newPass: string) => {
    const userId = await redisClient.get(`reset:${token}`);
    if (!userId) {
        throw new Error('Invalid or expired password reset token.');
    }

    const newHashedPassword = await bcrypt.hash(newPass, 10);

    // Cập nhật mật khẩu VÀ tăng tokenVersion
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            password: newHashedPassword,
            tokenVersion: {
                increment: 1, // Vô hiệu hóa tất cả các refresh token cũ
            },
        },
    });

    // Xóa token khỏi Redis
    await redisClient.del(`reset:${token}`);

    return updatedUser;
};