import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import config from '../config';
// import { checkRole } from '../middlewares/checkRole';
import { sensitiveActionRateLimiter } from '../middlewares/rateLimiter';

const router: Router = Router();

// --- PROXY CONFIGS ---
// Tạo các đối tượng proxy có thể tái sử dụng
const authProxy = createProxyMiddleware({
    target: config.services.auth,
    changeOrigin: true,
});

const userProxy = createProxyMiddleware({
    target: config.services.user,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        if (req.user && req.user.userId) {
            proxyReq.setHeader('x-user-id', req.user.userId);
        }
    },
});

const fileProxy = createProxyMiddleware({
    target: config.services.file,
    changeOrigin: true,
    pathRewrite: {
        '^/api/v1/files': '/api/v1',
    },
    onProxyReq: (proxyReq, req, res) => {
        if (req.user && req.user.userId) {
            proxyReq.setHeader('x-user-id', req.user.userId);
        }
    },
});

// --- ROUTE DEFINITIONS ---

// Các route AUTH nhạy cảm (cần rate limit nghiêm ngặt)
router.use(
    ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'],
    sensitiveActionRateLimiter,
    authProxy
);

// Các route AUTH còn lại (yêu cầu đăng nhập, ví dụ: /logout)
router.use('/auth/logout', authMiddleware, authProxy);
router.use('/auth/refresh', authProxy); // refresh token không cần authMiddleware

// Các route USER (yêu cầu đăng nhập)
router.use('/users', authMiddleware, userProxy);


// Các route FILE (yêu cầu đăng nhập)
router.use('/files', authMiddleware, fileProxy);


export default router;