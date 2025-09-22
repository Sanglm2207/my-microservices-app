import { Request, Response } from 'express';
import * as userService from '../services/user.service';

/**
 * Middleware để lấy thông tin user từ header.
 * Trong thực tế, bạn có thể tạo một middleware riêng cho việc này.
 */
const getUserIdFromHeader = (req: Request): string | null => {
    return req.headers['x-user-id'] as string | null;
};

export const getMyProfile = async (req: Request, res: Response) => {
    const userId = getUserIdFromHeader(req);
    if (!userId) {
        return res.status(401).json({ message: 'User ID not found in request headers.' });
    }

    // Giả sử email cũng được gửi từ Gateway, hoặc ta phải gọi auth-service để lấy
    const userEmail = req.headers['x-user-email'] as string || 'unknown@example.com';

    try {
        const userProfile = await userService.findOrCreateUserProfile(userId, userEmail);
        res.status(200).json(userProfile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateMyProfile = async (req: Request, res: Response) => {
    const userId = getUserIdFromHeader(req);
    if (!userId) {
        return res.status(401).json({ message: 'User ID not found in request headers.' });
    }

    try {
        const updatedProfile = await userService.updateUserProfile(userId, req.body);
        if (!updatedProfile) {
            return res.status(404).json({ message: 'User profile not found.' });
        }
        res.status(200).json(updatedProfile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};