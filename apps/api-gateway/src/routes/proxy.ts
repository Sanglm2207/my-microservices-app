import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { check2FAMiddleware } from '../middlewares/check2FA.middleware';
import { checkRole } from '../middlewares/checkRole';
import { sensitiveActionRateLimiter, generalRateLimiter } from '../middlewares/rateLimiter';
import config from '../config';

const router: Router = Router();

const onProxyReqWithUserHeaders = (proxyReq: any, req: any, res: any) => {
    if (req.user) {
        proxyReq.setHeader('x-user-id', req.user.userId);
        proxyReq.setHeader('x-user-email', req.user.email);
    }
};

const authProxy = createProxyMiddleware({
    target: config.services.auth,
    changeOrigin: true,
    onProxyReq: onProxyReqWithUserHeaders,
});

const userProxy = createProxyMiddleware({
    target: config.services.user,
    changeOrigin: true,
    onProxyReq: onProxyReqWithUserHeaders,
});

const fileProxy = createProxyMiddleware({
    target: config.services.file,
    changeOrigin: true,
    pathRewrite: {
        '^/api/v1/files': '/api/v1',
    },
    onProxyReq: onProxyReqWithUserHeaders,
});

router.use(
    ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/2fa/verify', '/auth/verify-email'],
    sensitiveActionRateLimiter,
    createProxyMiddleware({ target: config.services.auth, changeOrigin: true })
);

router.use('/auth/refresh', createProxyMiddleware({ target: config.services.auth, changeOrigin: true }));

const authenticatedAuthRoutes = Router();
authenticatedAuthRoutes.use(['/2fa/enable', '/2fa/confirm', '/2fa/disable', '/logout', '/change-password'], authProxy);
router.use('/auth', generalRateLimiter, authMiddleware, authenticatedAuthRoutes);

const businessRoutes = Router();
businessRoutes.use('/users/me', userProxy);
businessRoutes.use('/files', fileProxy);
router.use(generalRateLimiter, authMiddleware, check2FAMiddleware, businessRoutes);

const adminRoutes = Router();
adminRoutes.use('/users', userProxy);
router.use(generalRateLimiter, authMiddleware, check2FAMiddleware, checkRole(['ADMIN']), adminRoutes);

export default router;