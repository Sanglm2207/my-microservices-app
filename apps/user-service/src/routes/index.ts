import { Router } from 'express';
import userRoutes from './user.routes';

const router: Router = Router();

// Các route liên quan đến users sẽ có prefix /users
router.use('/users', userRoutes);

export default router;