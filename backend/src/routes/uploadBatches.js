import { Router } from 'express';
import UploadBatch from '../models/UploadBatch.js';

const router = Router();

router.get('/', async (_req, res) => {
  const batches = await UploadBatch.find()
    .populate('accountId', 'name bankId')
    .sort({ uploadedAt: -1 });
  res.json(batches);
});

export default router;
