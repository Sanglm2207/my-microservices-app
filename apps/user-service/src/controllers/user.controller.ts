import { NextFunction, Request, Response } from 'express';
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
    const userEmail = req.headers['x-user-email'] as string | null;

    if (!userId) {
        return res.status(401).json({ message: 'User ID not found in request headers.' });
    }

    if (!userEmail) {
        // Lỗi này cũng nên là 401 vì thiếu thông tin cần thiết
        return res.status(401).json({ message: 'Unauthorized: User email is missing from the request.' });
    }

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

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, search } = req.query as { page: string, limit: string, search?: string };
        const result = await userService.findAllUsers({
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            search,
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await userService.findUserById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

export const updateUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const updatedUser = await userService.updateUserById(req.params.id, req.body);
        if (!updatedUser) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(updatedUser);
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deletedProfile = await userService.deleteUserProfile(req.params.id);

        if (!deletedProfile) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        // 204 No Content là response chuẩn cho request DELETE thành công mà không cần trả về body
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};