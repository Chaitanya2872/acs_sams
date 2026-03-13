require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});

const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./src/config/database');
const { createLogDirectory, logger } = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production') {
  createLogDirectory();
}

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);
});

connectDB();

const server = app.listen(PORT, () => {
  const message = `
SAMS API Server is running
Environment: ${NODE_ENV}
Port: ${PORT}
URL: http://localhost:${PORT}
Health Check: http://localhost:${PORT}/api/health
Started at: ${new Date().toISOString()}
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

process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', {
    error: err.message,
    stack: err.stack
  });

  server.close(() => {
    process.exit(1);
  });
});

const shutdown = (signal) => {
  logger.info(`${signal} RECEIVED. Shutting down gracefully`);

  server.close(() => {
    mongoose.connection.close(false)
      .catch((error) => {
        logger.error('Error closing MongoDB connection during shutdown', {
          error: error.message,
          stack: error.stack
        });
      })
      .finally(() => {
        logger.info('Process terminated');
      });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
