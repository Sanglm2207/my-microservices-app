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
        path: '/api/v1/auth/refresh', // Quan trọng: path phải khớp với route
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

export const login = async (req: Request, res: Response) => {
    try {
        const validationResult = await authService.validateUser(req.body);
        // Kiểm tra xem service có trả về lỗi không
        if ('error' in validationResult) {
            // Nếu là lỗi chưa xác thực, trả về 403 Forbidden
            if (validationResult.error.includes('not verified')) {
                return res.status(403).json({ message: validationResult.error });
            }
            // Các lỗi khác (sai pass) trả về 401 Unauthorized
            return res.status(401).json({ message: validationResult.error });
        }

        // Nếu không có lỗi, validationResult chính là user
        const user = validationResult;

        const { accessToken, refreshToken } = authService.generateTokens(user);
        setTokenCookies(res, accessToken, refreshToken);

        res.status(200).json({ message: 'Logged in successfully' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
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