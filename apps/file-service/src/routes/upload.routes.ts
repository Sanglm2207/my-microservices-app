import { Router } from 'express';
import { multerUpload } from '../services/upload.service';
import { handleAvatarUpload } from '../controllers/upload.controller';

const router: Router = Router();

router.post('/avatar', multerUpload.single('avatar'), handleAvatarUpload);

export default router;