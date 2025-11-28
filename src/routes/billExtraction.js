import { Router } from 'express';
import { extractBillData } from '../controllers/billExtractionController.js';

const router = Router();

router.post('/extract-bill-data', extractBillData);

export default router;
