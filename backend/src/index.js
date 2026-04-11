require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes      = require('./routes/auth');
const houseRoutes     = require('./routes/houses');
const houseTypeRoutes = require('./routes/houseTypes');
const tenantRoutes    = require('./routes/tenants');
const paymentRoutes   = require('./routes/payments');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/auth',        authRoutes);
app.use('/api/houses',      houseRoutes);
app.use('/api/house-types', houseTypeRoutes);
app.use('/api/tenants',     tenantRoutes);
app.use('/api/payments',    paymentRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
