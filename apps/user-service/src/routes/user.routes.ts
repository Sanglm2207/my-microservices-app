import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { getUsersSchema, updateUserProfileSchema } from 'validation';
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

// --- Admin Routes (chỉ dành cho admin) ---
router.get('/', validate(getUsersSchema), userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.delete('/:id', userController.deleteUser);
router.patch('/:id', validate(updateUserProfileSchema), userController.updateUserById);

export default router;