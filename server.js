// Load environment variables first
require('dotenv').config({ 
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' 
});

const app = require('./app');
const connectDB = require('./src/config/database');
const { createLogDirectory, logger } = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create logs directory for production
if (NODE_ENV === 'production') {
  createLogDirectory();
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
      error: err.message,
      stack: err.stack
    });
    process.exit(1);
});

// Connect to database
connectDB();

// Start server
const server = app.listen(PORT, () => {
    const message = `
    🚀 SAMS API Server is running!
    📍 Environment: ${NODE_ENV}
    🌐 Port: ${PORT}
    🔗 URL: http://localhost:${PORT}
    📚 Health Check: http://localhost:${PORT}/api/health
    ⏰ Started at: ${new Date().toISOString()}
    `;
    
    if (NODE_ENV === 'development') {
      console.log(message);
    } else {
      logger.info('SAMS API Server Started', {
        environment: NODE_ENV,
        port: PORT,
        timestamp: new Date().toISOString()
      });
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...', {
      error: err.message,
      stack: err.stack
    });
    server.close(() => {
        process.exit(1);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        logger.info('💥 Process terminated!');
    });
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
    logger.info('👋 SIGINT RECEIVED. Shutting down gracefully');
    server.close(() => {
        logger.info('💥 Process terminated!');
    });
});

module.exports = server;