import { Router } from 'express';
import CategoryRule from '../models/CategoryRule.js';

const router = Router();

router.get('/rules', async (_req, res) => {
  const rules = await CategoryRule.find().sort({ priority: -1, createdAt: -1 });
  res.json(rules);
});

router.post('/rules', async (req, res) => {
  const rule = new CategoryRule(req.body);
  await rule.save();
  res.status(201).json(rule);
});

router.delete('/rules/:id', async (req, res) => {
  const rule = await CategoryRule.findByIdAndDelete(req.params.id);
  if (!rule) return res.status(404).json({ message: 'Rule not found' });
  res.json({ message: 'Deleted' });
});

export default router;
