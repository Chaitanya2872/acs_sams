const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Check if MONGODB_URI is defined
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sams_db';
    
    console.log('🔍 Attempting to connect to MongoDB...');
    console.log('📍 MongoDB URI:', mongoURI.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@')); // Hide credentials if any
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
    console.log(`🗄️  Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('💡 Make sure MongoDB is running on your system');
    console.error('📋 Connection string:', process.env.MONGODB_URI || 'Using default: mongodb://localhost:27017/sams_db');
    process.exit(1);
  }
};

module.exports = connectDB;