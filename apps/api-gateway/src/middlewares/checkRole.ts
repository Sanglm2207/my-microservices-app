import { Request, Response, NextFunction } from 'express';

type Role = 'USER' | 'ADMIN';

export const checkRole = (allowedRoles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Middleware này phải chạy SAU authMiddleware
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Forbidden: No role information.' });
        }

        const userRole = req.user.role;
        if (allowedRoles.includes(userRole)) {
            return next(); // Người dùng có quyền, tiếp tục
        } else {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
        }
    };
};