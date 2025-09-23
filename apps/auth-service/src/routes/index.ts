import { Router } from 'express';
import authRoutes from './auth.routes';
import internalRoutes from './internal.routes';

const router: Router = Router();

// Tất cả các route liên quan đến auth sẽ có prefix /auth
router.use('/auth', authRoutes);
router.use('/internal', internalRoutes);

export default router;