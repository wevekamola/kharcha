import { Router } from 'express';
import Transaction from '../models/Transaction.js';

const router = Router();

// GET /api/transactions?startDate&endDate&accountId&category&type&page&limit
router.get('/', async (req, res) => {
  const { startDate, endDate, accountId, category, type, page = 1, limit = 50 } = req.query;
  const filter = buildFilter({ startDate, endDate, accountId, category, type });

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('accountId', 'name bankId color')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Transaction.countDocuments(filter),
  ]);

  res.json({ transactions, total, page: Number(page), limit: Number(limit) });
});

// GET /api/transactions/summary
router.get('/summary', async (req, res) => {
  const { startDate, endDate, accountId } = req.query;
  const filter = buildFilter({ startDate, endDate, accountId });

  const result = await Transaction.aggregate([
    { $match: filter },
    {
      $group: {
        _id:          null,
        totalDebit:   { $sum: '$debit' },
        totalCredit:  { $sum: '$credit' },
        count:        { $sum: 1 },
      },
    },
  ]);

  const summary = result[0] || { totalDebit: 0, totalCredit: 0, count: 0 };
  summary.net = summary.totalCredit - summary.totalDebit;
  res.json(summary);
});

// GET /api/transactions/timeline?groupBy=month|week
router.get('/timeline', async (req, res) => {
  const { startDate, endDate, accountId, groupBy = 'month' } = req.query;
  const filter = buildFilter({ startDate, endDate, accountId });

  const dateFormat = groupBy === 'week' ? '%Y-%U' : '%Y-%m';
  const result = await Transaction.aggregate([
    { $match: filter },
    {
      $group: {
        _id:         { $dateToString: { format: dateFormat, date: '$date' } },
        totalDebit:  { $sum: '$debit' },
        totalCredit: { $sum: '$credit' },
        count:       { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json(result);
});

// GET /api/transactions/top-merchants?limit=10
router.get('/top-merchants', async (req, res) => {
  const { startDate, endDate, accountId, limit = 10 } = req.query;
  const filter = buildFilter({ startDate, endDate, accountId });
  // Only debit UPI transactions have merchantName
  filter['parsedNarration.paymentType'] = 'UPI';
  filter['debit'] = { $gt: 0 };

  const result = await Transaction.aggregate([
    { $match: filter },
    {
      $group: {
        _id:         '$parsedNarration.merchantName',
        total:       { $sum: '$debit' },
        count:       { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: Number(limit) },
  ]);

  res.json(result);
});

// PATCH /api/transactions/:id — update category
router.patch('/:id', async (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ message: 'category required' });

  const tx = await Transaction.findByIdAndUpdate(
    req.params.id,
    { category, categorySource: 'manual' },
    { new: true },
  );
  if (!tx) return res.status(404).json({ message: 'Transaction not found' });
  res.json(tx);
});

function buildFilter({ startDate, endDate, accountId, category, type } = {}) {
  const filter = {};
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate)   filter.date.$lte = new Date(endDate);
  }
  if (accountId) filter.accountId = accountId;
  if (category)  filter.category = category;
  if (type === 'debit')  filter.debit  = { $gt: 0 };
  if (type === 'credit') filter.credit = { $gt: 0 };
  return filter;
}

export default router;
