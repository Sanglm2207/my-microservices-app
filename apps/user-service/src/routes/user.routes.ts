import { Router } from 'express';
import * as userController from '../controllers/user.controller';

const router: Router = Router();

// Lấy thông tin profile của user đang đăng nhập
router.get('/me', userController.getMyProfile);

// Cập nhật thông tin profile của user đang đăng nhập
router.patch('/me', userController.updateMyProfile);

export default router;