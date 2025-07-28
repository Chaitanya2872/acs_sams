const fs = require('fs');
const path = require('path');

const createLogDirectory = () => {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
};

const logger = {
  info: (message, meta = {}) => {
    const logEntry = {
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    };
    
    if (process.env.NODE_ENV === 'production') {
      fs.appendFileSync(
        path.join(process.cwd(), 'logs', 'sams-api.log'),
        JSON.stringify(logEntry) + '\n'
      );
    } else {
      console.log(`[INFO] ${message}`, meta);
    }
  },

  error: (message, meta = {}) => {
    const logEntry = {
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    };
    
    if (process.env.NODE_ENV === 'production') {
      fs.appendFileSync(
        path.join(process.cwd(), 'logs', 'sams-error.log'),
        JSON.stringify(logEntry) + '\n'
      );
    } else {
      console.error(`[ERROR] ${message}`, meta);
    }
  },

  warn: (message, meta = {}) => {
    const logEntry = {
      level: 'warn',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    };
    
    if (process.env.NODE_ENV === 'production') {
      fs.appendFileSync(
        path.join(process.cwd(), 'logs', 'sams-api.log'),
        JSON.stringify(logEntry) + '\n'
      );
    } else {
      console.warn(`[WARN] ${message}`, meta);
    }
  }
};

module.exports = { logger, createLogDirectory };