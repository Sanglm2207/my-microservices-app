import { NextFunction, Request, Response } from 'express';
import * as authService from '../services/auth.service';
import config from '../config';
import logger from 'logger';

const setTokenCookies = (res: Response, accessToken: string, refreshToken: string) => {
    res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 phút
    });
    res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth/', // Quan trọng: path phải khớp với route
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });
};

export const register = async (req: Request, res: Response) => {
    try {
        const user = await authService.registerUser(req.body);
        res.status(201).json({ message: 'User registered successfully', user });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return res.status(409).json({ message: 'Email already exists' });
        }
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validationResult = await authService.validateUser(req.body);
        if ('error' in validationResult) {
            if (validationResult.error.includes('not verified')) return res.status(403).json({ message: validationResult.error });
            return res.status(401).json({ message: validationResult.error });
        }

        const user = validationResult;

        // Logic 2FA mới
        if (user.twoFactorEnabled) {
            const otpSessionToken = await authService.createOtpSession(user.id);
            return res.status(200).json({
                twoFactorRequired: true,
                otpSessionToken: otpSessionToken,
            });
        }

        // Luồng cũ không có 2FA
        const { accessToken, refreshToken } = authService.generateTokens(user);
        setTokenCookies(res, accessToken, refreshToken);
        res.status(200).json({ twoFactorRequired: false, message: 'Logged in successfully' });
    } catch (error) {
        next(error);
    }
};

// Endpoint để xác thực 2FA khi login
export const verify2FA = async (req: Request, res: Response, next: NextFunction) => {
    const { otpSessionToken, token } = req.body;
    try {
        const user = await authService.verifyOtpAndLogin(otpSessionToken, token);
        const { accessToken, refreshToken } = authService.generateTokens(user, true); // isTwoFactorAuthenticated = true
        setTokenCookies(res, accessToken, refreshToken);
        res.json({ message: '2FA verification successful. Logged in.' });
    } catch (error: any) {
        if (error.message.includes('Invalid 2FA token')) return res.status(400).json({ message: error.message });
        if (error.message.includes('invalid or has expired')) return res.status(401).json({ message: error.message });
        next(error);
    }
};

// Endpoint để bắt đầu quá trình bật 2FA
export const enable2FA = async (req: Request, res: Response, next: NextFunction) => {
    console.log("req", req.headers['x-user-id']);
    const userId = req.headers['x-user-id'] as string;
    const userEmail = req.headers['x-user-email'] as string;

    if (!userId || !userEmail) {
        return res.status(401).json({ message: "Unauthorized: Missing user information from token." });
    }

    try {
        const { qrCodeDataURL } = await authService.generateTwoFactorSecret(userId, userEmail);
        res.json({ qrCodeDataURL });
    } catch (error) { next(error); }
};

// Endpoint để xác nhận và kích hoạt 2FA
export const confirm2FA = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    const { token } = req.body;
    try {
        const isVerified = await authService.verifyAndEnableTwoFactor(userId, token);
        if (!isVerified) return res.status(400).json({ message: 'Invalid 2FA token. Please try again.' });
        res.json({ message: '2FA has been enabled successfully.' });
    } catch (error) { next(error); }
};


export const refreshToken = async (req: Request, res: Response) => {
    const token = req.cookies.refresh_token;
    if (!token) {
        return res.status(401).json({ message: 'Refresh token not found' });
    }

    try {
        const user = await authService.verifyAndGetUserFromRefreshToken(token);
        if (!user) {
            return res.status(403).json({ message: 'Invalid or expired refresh token' });
        }

        // Vô hiệu hóa refresh token cũ để tránh tái sử dụng (xoay vòng token)
        await authService.blacklistRefreshToken(token);

        const { accessToken, refreshToken: newRefreshToken } = authService.generateTokens(user);
        setTokenCookies(res, accessToken, newRefreshToken);

        res.status(200).json({ message: 'Tokens refreshed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const logout = async (req: Request, res: Response) => {
    const token = req.cookies.refresh_token;
    if (token) {
        await authService.blacklistRefreshToken(token);
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });

    res.status(200).json({ message: 'Logged out successfully' });
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await authService.requestPasswordReset(req.body.email);
        res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, newPassword } = req.body;
        await authService.resetPassword(token, newPassword);
        res.status(200).json({ message: 'Password has been reset successfully.' });
    } catch (error) {
        // Chuyển lỗi (ví dụ token không hợp lệ) đến errorHandler
        next(error);
    }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        await authService.changePassword(userId, req.body);
        res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error: any) {
        // Trả về lỗi 400 cho các lỗi nghiệp vụ cụ thể
        if (error.message.includes('Incorrect current password') || error.message.includes('Please verify your email')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.query as { token: string };
        const success = await authService.verifyUserEmail(token);
        if (!success) {
            return res.status(400).send('<h1>Invalid or expired verification link.</h1>');
        }
        res.status(200).send('<h1>Email verified successfully! You can now close this tab.</h1>');
    } catch (error) {
        next(error);
    }
};