import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { updateUserProfileSchema } from 'validation';
import { validate } from 'middlewares';

const router: Router = Router();

// Lấy thông tin profile của user đang đăng nhập
router.get('/me', userController.getMyProfile);

// Cập nhật thông tin profile của user đang đăng nhập
router.patch(
    '/me',
    validate(updateUserProfileSchema),
    userController.updateMyProfile
);

export default router;