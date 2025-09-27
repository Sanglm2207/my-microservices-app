import { prisma, User, Role } from 'database';
import { redisClient } from 'cache';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as CryptoJS from 'crypto-js';
import config from '../config';
import { JWTPayload, LoginRequestBody, RegisterRequestBody } from 'common-types';
import {
    publishAccountPendingEvent,
    publishPasswordResetRequestedEvent,
} from 'message-producer';

import { randomBytes } from 'crypto';

const encrypt = (text: string) => CryptoJS.AES.encrypt(text, config.twoFactorEncryptionKey).toString();
const decrypt = (ciphertext: string) => CryptoJS.AES.decrypt(ciphertext, config.twoFactorEncryptionKey).toString(CryptoJS.enc.Utf8);


/**
 * Đăng ký người dùng mới
 */
export const registerUser = async (
    userData: RegisterRequestBody
): Promise<Omit<User, 'password'>> => {
    const { email, password, name } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            status: 'PENDING', // Mặc định trạng thái là PENDING
        },
    });

    const verificationToken = randomBytes(32).toString('hex');
    await redisClient.set(`verify:${verificationToken}`, newUser.id, 'EX', 86400); // 24 giờ

    // Bắn 2 sự kiện riêng biệt
    await publishAccountPendingEvent({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        verificationToken,
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
): Promise<User | { error: string }> => {
    const user = await prisma.user.findUnique({
        where: { email: credentials.email },
    });

    // User không tồn tại hoặc sai mật khẩu
    if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
        return { error: 'Invalid email or password' };
    }

    // User tồn tại, đúng mật khẩu, nhưng chưa xác thực email
    if (!user.isVerified) {
        return { error: 'Please verify your email before logging in.' };
    }

    return user;
};

// ---  2FA ---


/**
 * Tạo Access Token và Refresh Token
 */
export const generateTokens = (user: User, isTwoFactorAuthenticated = false) => {
    // const accessTokenPayload = { userId: user.id, role: user.role, email: user.email };
    // const refreshTokenPayload = { userId: user.id, version: user.tokenVersion };
    const isFullyAuthenticated = !user.twoFactorEnabled || isTwoFactorAuthenticated;
    const accessTokenPayload: JWTPayload = {
        userId: user.id, role: user.role, email: user.email,
        isTwoFactorAuthenticated: isFullyAuthenticated,
    };

    const accessToken = jwt.sign(accessTokenPayload, config.jwt.accessTokenSecret, { expiresIn: config.jwt.accessTokenExpiresIn });
    const refreshTokenPayload = { userId: user.id, version: user.tokenVersion };
    const refreshToken = jwt.sign(refreshTokenPayload, config.jwt.refreshTokenSecret, { expiresIn: config.jwt.refreshTokenExpiresIn });
    return { accessToken, refreshToken };
};

/**
 * Bắt đầu quá trình bật 2FA: Tạo secret và QR code
 */
export const generateTwoFactorSecret = async (userId: string, email: string) => {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });
    if (!user) throw new Error("User not found");
    if (user.twoFactorEnabled) throw new Error("2FA is already enabled.");

    const secret = speakeasy.generateSecret({ name: `MyAwesomeApp (${email})` });

    // Lưu secret đã mã hóa vào DB
    await prisma.user.update({
        where: { id: userId },
        data: { twoFactorSecret: encrypt(secret.base32) },
    });

    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url!);
    return { qrCodeDataURL };
};

/**
 * Xác thực mã OTP và chính thức kích hoạt 2FA
 */
export const verifyAndEnableTwoFactor = async (userId: string, token: string): Promise<boolean> => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
        throw new Error("2FA setup process was not initiated for this user.");
    }

    const decryptedSecret = decrypt(user.twoFactorSecret);
    const isVerified = speakeasy.totp.verify({ secret: decryptedSecret, encoding: 'base32', token, window: 1 });

    if (isVerified) {
        await prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true },
        });
    } else {
        // Nếu sai, xóa secret để user phải bắt đầu lại từ đầu
        await prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: null },
        });
    }
    return isVerified;
};

/**
 * Tạo một OTP session token tạm thời khi login với tài khoản có 2FA
 */
export const createOtpSession = async (userId: string): Promise<string> => {
    const otpSessionToken = randomBytes(32).toString('hex');
    await redisClient.set(`otp-session:${otpSessionToken}`, userId, 'EX', 180); // 3 phút TTL
    return otpSessionToken;
};

/**
 * Xác thực mã 2FA và hoàn tất đăng nhập
 */
export const verifyOtpAndLogin = async (otpSessionToken: string, twoFactorToken: string): Promise<User> => {
    const userId = await redisClient.get(`otp-session:${otpSessionToken}`);
    if (!userId) {
        throw new Error('OTP session is invalid or has expired.');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new Error('User is not configured for 2FA.');
    }

    const decryptedSecret = decrypt(user.twoFactorSecret);
    const isVerified = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: twoFactorToken,
        window: 1,
    });

    if (!isVerified) {
        throw new Error('Invalid 2FA token.');
    }

    await redisClient.del(`otp-session:${otpSessionToken}`);
    return user;
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
        resetToken: resetToken,
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

interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}

/**
 * Thay đổi mật khẩu khi đang đăng nhập
 */
export const changePassword = async (userId: string, passData: ChangePasswordPayload) => {
    const { currentPassword, newPassword } = passData;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new Error('User not found.');
    }
    if (!user.isVerified) {
        throw new Error('Please verify your email before changing the password.');
    }
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordMatch) {
        throw new Error('Incorrect current password.');
    }
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: userId },
        data: {
            password: newHashedPassword,
            tokenVersion: { increment: 1 },
        },
    });
};


export const verifyUserEmail = async (token: string): Promise<boolean> => {
    const userId = await redisClient.get(`verify:${token}`);
    if (!userId) return false;
    await prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
    await redisClient.del(`verify:${token}`);
    return true;
};