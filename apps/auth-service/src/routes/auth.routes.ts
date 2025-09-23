import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from 'middlewares';
import { registerSchema, loginSchema } from 'validation';

const router: Router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

export default router;