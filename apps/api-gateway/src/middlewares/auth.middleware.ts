import { Request, Response, NextFunction } from 'express';
import { verifyToken } from 'auth-client';
import { JWTPayload } from 'common-types';
import logger from 'logger';

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
        return res.status(401).json({ message: 'Access Denied. No token provided.' });
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded as JWTPayload;
        next();
    } catch (err: any) {
        logger.error({ error_name: err.name, error_message: err.message }, 'Auth Middleware: TOKEN VERIFICATION FAILED!');

        // Đảm bảo RETURN ở đây
        return res.status(401).json({ message: 'Unauthorized. Invalid or expired token.' });
    }
};