import { Router } from 'express';
import * as recipes from '../controllers/recipes.controller.js';
import * as pricing from '../controllers/pricing.controller.js';

const router = Router();

router.get('/', recipes.list);
router.post('/', recipes.create);
router.get('/:id', recipes.detail);
router.put('/:id', recipes.update);
router.delete('/:id', recipes.remove);

router.post('/:id/calculate', pricing.calculate);
router.get('/:id/pricing', pricing.getLatest);

export default router;
