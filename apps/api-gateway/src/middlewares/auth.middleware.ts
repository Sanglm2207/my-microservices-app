import { Request, Response, NextFunction } from 'express';
import { verifyToken } from 'auth-client';
import { JWTPayload } from 'common-types';

// Augment the Express Request type to include our custom 'user' property
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.access_token;

    if (!token) {
        // Nếu không có token, đây là lỗi "Unauthorized"
        return res.status(401).json({ message: 'Access Denied. No token provided.' });
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded as JWTPayload; // Gắn thông tin user vào request
        next();
    } catch (err: any) {
        // Token có thể sai hoặc đã hết hạn
        // Lỗi "Forbidden" vì client có token nhưng không hợp lệ
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};