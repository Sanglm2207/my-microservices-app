import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from 'common-types'; // Đảm bảo common-types đã có isTwoFactorAuthenticated

// Mở rộng kiểu Request của Express để nó biết về thuộc tính 'user'
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

/**
 * Middleware này kiểm tra xem người dùng đã hoàn thành bước xác thực hai yếu tố hay chưa.
 * Nó BẮT BUỘC phải được chạy SAU `authMiddleware`.
 */
export const check2FAMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // authMiddleware phải chạy trước và đã gắn req.user
    if (!req.user) {
        // Lỗi logic - đáng lẽ không bao giờ xảy ra nếu router được cấu hình đúng
        return res.status(500).json({ message: 'Cannot perform 2FA check without user authentication.' });
    }

    // Nếu cờ isTwoFactorAuthenticated là true, có nghĩa là user đã đăng nhập đầy đủ
    // -> Cho phép request đi tiếp
    if (req.user.isTwoFactorAuthenticated) {
        return next();
    }

    // Nếu cờ là false, từ chối truy cập và yêu cầu xác thực 2FA
    return res.status(403).json({
        message: 'Forbidden: Two-factor authentication is required to access this resource.',
        twoFactorRequired: true
    });
};