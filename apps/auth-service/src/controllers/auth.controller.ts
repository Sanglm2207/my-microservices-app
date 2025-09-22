import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import config from '../config';

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
        const user = await authService.validateUser(req.body);
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const { accessToken, refreshToken } = authService.generateTokens(user);
        setTokenCookies(res, accessToken, refreshToken);

        res.status(200).json({ message: 'Logged in successfully' });
    } catch (error) {
        console.error(error);
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