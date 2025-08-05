import mongoose from 'mongoose';
import { serverConfig } from './config';

type ConnectionObject = {
  isConnected?: number;
};

const connection: ConnectionObject = {};

async function connectDB(): Promise<void> {
  // Check if we have a connection to the database or if it's currently connecting
  if (connection.isConnected) {
    console.log('Already connected to the database');
    return;
  }

  try {
    // Connect to MongoDB
    const db = await mongoose.connect(serverConfig.mongoUri, {
      bufferCommands: false,
    });

    connection.isConnected = db.connections[0].readyState;

    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    // Exit process with failure
    process.exit(1);
  }
}

export default connectDB;