import { Router } from 'express';
import uploadRoutes from './upload.routes';

const router: Router = Router();

// Các route liên quan đến users sẽ có prefix /upload
router.use('/upload', uploadRoutes);

export default router;