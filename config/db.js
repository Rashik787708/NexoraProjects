const mongoose = require('mongoose');

let mongod = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log('Local MongoDB not found. Starting in-memory database...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);
      console.log('Note: Data will reset on restart. Install MongoDB for persistent storage.');
    } catch (memError) {
      console.error(`Database connection error: ${memError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
