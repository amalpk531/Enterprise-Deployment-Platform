const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/enterprise_app';

app.use(cors());
app.use(express.json());

let inMemoryTransactions = [];

const transactionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['income', 'expense'], default: 'expense' },
  category: { type: String, required: true, trim: true },
  date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

transactionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'enterprise-app-backend'
  });
});

const isDbReady = () => mongoose.connection.readyState === 1;

const serializeTransaction = (tx) => ({
  ...tx.toObject?.() ? tx.toObject() : tx,
  amount: Number(tx.amount)
});

const getTransactions = async () => {
  if (isDbReady()) {
    return (await Transaction.find().sort({ date: -1, createdAt: -1 })).map(serializeTransaction);
  }

  return inMemoryTransactions
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(serializeTransaction);
};

const createTransaction = async (payload) => {
  if (isDbReady()) {
    const transaction = new Transaction(payload);
    await transaction.save();
    return serializeTransaction(transaction);
  }

  const transaction = {
    _id: `${Date.now()}`,
    ...payload,
    amount: Number(payload.amount),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  inMemoryTransactions.unshift(transaction);
  return transaction;
};

const updateTransaction = async (id, payload) => {
  if (isDbReady()) {
    const transaction = await Transaction.findByIdAndUpdate(
      id,
      { ...payload, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!transaction) return null;
    return serializeTransaction(transaction);
  }

  const transaction = inMemoryTransactions.find((item) => item._id === id);
  if (!transaction) return null;

  Object.assign(transaction, {
    ...payload,
    amount: Number(payload.amount ?? transaction.amount),
    updatedAt: new Date().toISOString()
  });
  return transaction;
};

const deleteTransaction = async (id) => {
  if (isDbReady()) {
    const transaction = await Transaction.findByIdAndDelete(id);
    return Boolean(transaction);
  }

  const originalLength = inMemoryTransactions.length;
  inMemoryTransactions = inMemoryTransactions.filter((item) => item._id !== id);
  return inMemoryTransactions.length < originalLength;
};

app.get('/api/transactions', async (req, res) => {
  try {
    res.json(await getTransactions());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const transaction = await createTransaction(req.body);
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/transactions/:id', async (req, res) => {
  try {
    const transactions = await getTransactions();
    const transaction = transactions.find((item) => item._id === req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/transactions/:id', async (req, res) => {
  try {
    const transaction = await updateTransaction(req.params.id, req.body);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const deleted = await deleteTransaction(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items', async (req, res) => {
  const transactions = await getTransactions();
  res.json(transactions);
});

const connectWithRetry = () => {
  mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
      console.error('MongoDB connection failed, retrying in 5s...', err.message);
      setTimeout(connectWithRetry, 5000);
    });
};

if (process.env.NODE_ENV !== 'test') {
  connectWithRetry();
}

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
