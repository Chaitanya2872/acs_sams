const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// ===== ESSENTIAL MIDDLEWARE SETUP =====
// This MUST come before your routes!

// 1. Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// 2. CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 3. Request logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 4. **CRITICAL**: Body parsing middleware - MUST be before routes
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

// 5. Additional middleware for better request handling
app.use((req, res, next) => {
  // Log request details for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n📥 ${req.method} ${req.path}`);
    console.log('├─ Content-Type:', req.headers['content-type'] || 'Not set');
    console.log('├─ Body exists:', !!req.body);
    console.log('└─ Body type:', typeof req.body);
  }
  next();
});

// ===== DATABASE CONNECTION =====
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  console.log('📊 Database:', mongoose.connection.name);
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error.message);
  process.exit(1);
});

// ===== ROUTES =====
// Import your routes
const authRoutes = require('./src/routes/authRoutes');
const structuresRoutes = require('./src/routes/structures');
const userRoutes = require('./src/routes/users');
// Add other routes as needed
// const structureRoutes = require('./src/routes/structures');
// const adminRoutes = require('./src/routes/admin');

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SAMS API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/structures', structuresRoutes);
// app.use('/api/structures', structureRoutes);
// app.use('/api/admin', adminRoutes);

// ===== ERROR HANDLING =====

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: {
      auth: '/api/auth/*',
      users: '/api/users/*'
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('💥 Global Error Handler:');
  console.error('├─ Error:', error.message);
  console.error('├─ Stack:', error.stack);
  console.error('├─ Request:', req.method, req.path);
  console.error('└─ Body:', req.body);

  // Handle specific error types
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

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error
    })
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Promise Rejection:');
  console.error('├─ Reason:', reason);
  console.error('└─ Promise:', promise);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:');
  console.error('├─ Error:', error.message);
  console.error('└─ Stack:', error.stack);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('📊 MongoDB connection closed.');
    process.exit(0);
  });
});

module.exports = app;