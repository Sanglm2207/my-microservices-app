import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from 'middlewares';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, twoFactorTokenSchema, verifyLogin2FASchema } from 'validation';

const router: Router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication related endpoints
 *
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin' // Giả sử có schema này trong JSDoc
 *     responses:
 *       200:
 *         description: Login successful, cookies are set.
 *       401:
 *         description: Invalid credentials.
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister' // Giả sử có schema này trong JSDoc
 *     responses:
 *       201:
 *         description: User registered successfully.
 *       400:
 *         description: Bad request, validation errors.
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token issued, cookies are updated.
 *       401:
 *         description: Refresh token is missing or invalid.
 */
router.post('/refresh', authController.refreshToken);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Log out a user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User logged out successfully, cookies are cleared.
 *       401:
 *         description: User is not authenticated.
 */
router.post('/logout', authController.logout);

router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Xác thực email người dùng, click vào link trong email
router.get('/verify-email', authController.verifyEmail);

router.post(
    '/change-password',
    validate(changePasswordSchema),
    authController.changePassword
);

// Luồng quản lý 2FA (yêu cầu đã đăng nhập, sẽ được bảo vệ bởi Gateway)
router.post('/2fa/enable', authController.enable2FA);
router.post('/2fa/confirm', validate(twoFactorTokenSchema), authController.confirm2FA);

// Luồng xác thực 2FA khi đăng nhập (không yêu cầu JWT)
router.post('/2fa/verify', validate(verifyLogin2FASchema), authController.verify2FA);


export default router;