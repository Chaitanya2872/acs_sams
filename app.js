const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const passport = require('passport');
const { logger } = require('./src/utils/logger');
require('dotenv').config();

// Import routes
const authRoutes = require('./src/routes/auth');
const structureRoutes = require('./src/routes/structures');
const userRoutes = require('./src/routes/users');

// Import passport config
require('./src/config/passport');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for production (if behind load balancer)
if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(cors({
  origin: process.env.CORS_ORIGIN||'https://acs-sams.onrender.com/api',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression({
  level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
  threshold: 1024
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',') 
      : [process.env.CLIENT_URL];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Logging middleware
if (isProduction) {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
} else {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Passport middleware
app.use(passport.initialize());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/structures', structureRoutes);
app.use('/api/users', userRoutes);

// Health check route with detailed info
app.get('/api/health', (req, res) => {
  const healthData = {
    success: true,
    message: 'SAMS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid
  };

  res.status(200).json(healthData);
});

// API documentation route
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SAMS API Documentation',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      structures: '/api/structures',
      users: '/api/users',
      health: '/api/health'
    },
    documentation: 'https://documenter.getpostman.com/view/your-postman-docs'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log error
  logger.error('Global Error Handler', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const errorMessage = isProduction ? 'Internal Server Error' : err.message;
  const errorDetails = isProduction ? {} : { stack: err.stack };

  res.status(err.statusCode || 500).json({
    success: false,
    message: errorMessage,
    error: errorDetails
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 Not Found', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

module.exports = app;