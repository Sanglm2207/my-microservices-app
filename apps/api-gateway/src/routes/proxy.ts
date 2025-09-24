import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import config from '../config';
import { checkRole } from '../middlewares/checkRole';

const router: Router = Router();

// Định nghĩa các service và target của chúng
const services = [
    {
        route: '/auth',
        target: config.services.auth,
    },
    {
        route: '/users',
        target: config.services.user,
    },
    {
        route: '/files',
        target: config.services.file,
    },
];

// Các route công khai (không cần xác thực)
// Ví dụ: /api/v1/auth/login, /api/v1/auth/register, /api/v1/auth/refresh
router.use(
    services[0].route, // /auth
    createProxyMiddleware({
        target: services[0].target,
        changeOrigin: true,
        pathRewrite: (path, req) => {
            // Ví dụ: /api/v1/auth/login -> /api/v1/auth/login
            // Chỉ cần xóa prefix của gateway nếu cần, ở đây path đã đúng
            return path;
        },
    })
);

// Các route cần được bảo vệ (cần xác thực)
// Ví dụ: /api/v1/users/me
router.use(
    services[1].route, // /users
    authMiddleware,
    checkRole(['ADMIN', 'USER']),
    createProxyMiddleware({
        target: services[1].target,
        changeOrigin: true,
        pathRewrite: (path, req) => {
            return path;
        },
        onProxyReq: (proxyReq, req, res) => {
            // Gửi thông tin user đã được xác thực tới service con
            if (req.user && req.user.userId) {
                proxyReq.setHeader('x-user-id', req.user.userId);
            }
        },
    })
);

// Proxy to File Service (protected)
router.use(
    services[2].route, // /files
    authMiddleware,
    checkRole(['ADMIN']),
    createProxyMiddleware({
        target: services[2].target,
        changeOrigin: true,
        pathRewrite: (path, req) => {
            return path.replace('/api/v1/files', '/api/v1');
        },
        onProxyReq: (proxyReq, req, res) => {
            // Gửi thông tin user đã được xác thực tới service con
            if (req.user && req.user.userId) {
                proxyReq.setHeader('x-user-id', req.user.userId);
            }
        },
    })
);


export default router;