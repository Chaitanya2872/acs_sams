const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({
  limit: '50mb',
  strict: true,
  type: 'application/json'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '50mb',
  type: 'application/x-www-form-urlencoded'
}));

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n[REQ] ${req.method} ${req.path}`);
    console.log('[REQ] Content-Type:', req.headers['content-type'] || 'Not set');
    console.log('[REQ] Body exists:', !!req.body);
    console.log('[REQ] Body type:', typeof req.body);
  }

  next();
});

const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/admin');
const structuresRoutes = require('./src/routes/structures');
const userRoutes = require('./src/routes/users');
const reportsRoutes = require('./src/routes/reports');

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SAMS API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT
  });
});

app.get('/api/health', (req, res) => {
  const isDatabaseConnected = mongoose.connection.readyState === 1;

  res.status(isDatabaseConnected ? 200 : 503).json({
    success: isDatabaseConnected,
    message: isDatabaseConnected ? 'SAMS API is healthy' : 'SAMS API is starting up',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT,
    database: {
      connected: isDatabaseConnected,
      readyState: mongoose.connection.readyState,
      name: mongoose.connection.name || null
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/structures', structuresRoutes);
app.use('/api/reports', reportsRoutes);

app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: {
      auth: '/api/auth/*',
      users: '/api/users/*',
      health: '/api/health'
    }
  });
});

app.use((error, req, res, next) => {
  console.error('[ERR] Global Error Handler');
  console.error('[ERR] Error:', error.message);
  console.error('[ERR] Stack:', error.stack);
  console.error('[ERR] Request:', req.method, req.path);
  console.error('[ERR] Body:', req.body);

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      details: 'Please check your JSON syntax'
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request body too large',
      details: 'Maximum size is 50MB'
    });
  }

  return res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  });
});

module.exports = app;
