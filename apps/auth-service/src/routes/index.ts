import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

// Tất cả các route liên quan đến auth sẽ có prefix /auth
router.use('/auth', authRoutes);

export default router;