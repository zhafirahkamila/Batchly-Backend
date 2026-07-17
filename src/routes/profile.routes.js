import { Router } from 'express';
import * as ctrl from '../controllers/profile.controller.js';

const router = Router();

router.get('/', ctrl.get);
router.put('/', ctrl.update);

export default router;
