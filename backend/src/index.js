import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { seedAdmin } from './seed.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes        from './routes/auth.js';
import accountRoutes     from './routes/accounts.js';
import transactionRoutes from './routes/transactions.js';
import uploadRoutes      from './routes/upload.js';
import categoryRoutes    from './routes/categories.js';
import uploadBatchRoutes from './routes/uploadBatches.js';

const app = express();

app.use(cors());
app.use(express.json());

// Public
app.use('/api/auth', authRoutes);

// Protected
app.use('/api/accounts',       requireAuth, accountRoutes);
app.use('/api/transactions',   requireAuth, transactionRoutes);
app.use('/api/upload',         requireAuth, uploadRoutes);
app.use('/api/categories',     requireAuth, categoryRoutes);
app.use('/api/upload-batches', requireAuth, uploadBatchRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => seedAdmin())
  .then(() => {
    app.listen(PORT, () => console.log(`Kharcha backend listening on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
