import { Router } from 'express';
import Account from '../models/Account.js';

const router = Router();

router.get('/', async (_req, res) => {
  const accounts = await Account.find().sort({ createdAt: -1 });
  res.json(accounts);
});

router.post('/', async (req, res) => {
  const account = new Account(req.body);
  await account.save();
  res.status(201).json(account);
});

router.patch('/:id', async (req, res) => {
  const account = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!account) return res.status(404).json({ message: 'Account not found' });
  res.json(account);
});

router.delete('/:id', async (req, res) => {
  const account = await Account.findByIdAndDelete(req.params.id);
  if (!account) return res.status(404).json({ message: 'Account not found' });
  res.json({ message: 'Deleted' });
});

export default router;
