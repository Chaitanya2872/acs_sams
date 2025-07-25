// Load environment variables first, before anything else
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = require('./app');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

// Debug environment variables
console.log('🔍 Environment Debug Info:');
console.log('📁 Working Directory:', process.cwd());
console.log('🌍 NODE_ENV:', NODE_ENV);
console.log('🔌 PORT:', PORT);
console.log('🗄️  MongoDB URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');

// Connect to database
connectDB();

// Start server
const server = app.listen(PORT, () => {
    console.log(`
    🚀 SAMS API Server is running!
    📍 Environment: ${NODE_ENV}
    🌐 Port: ${PORT}
    🔗 URL: http://localhost:${PORT}
    📚 Health Check: http://localhost:${PORT}/api/health
    `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        console.log('💥 Process terminated!');
    });
});