const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const healthRoutes = require('./routes/health.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const adminRoutes = require('./routes/admin.routes');
const safetyRoutes = require('./routes/safety.routes');

const app = express();

if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(helmet());

app.use(cors({
  origin: env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', adminRoutes);
app.use('/api', safetyRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
