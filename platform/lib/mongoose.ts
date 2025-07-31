import mongoose from 'mongoose';
import connectDB from './database';

// Connection utility specifically for Next.js API routes and server components
interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB with connection caching for Next.js
 * This prevents multiple connections in serverless environments
 */
async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = connectDB().then(() => mongoose);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Disconnect from MongoDB
 */
async function dbDisconnect() {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

/**
 * Get connection status
 */
function getConnectionStatus() {
  return {
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    states: {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }
  };
}

/**
 * Middleware for Next.js API routes to ensure database connection
 */
export function withDatabase(handler: any) {
  return async (req: any, res: any) => {
    try {
      await dbConnect();
      return await handler(req, res);
    } catch (error) {
      console.error('Database middleware error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ 
        error: 'Database connection failed',
        message: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error'
      });
    }
  };
}

// Extend global type for TypeScript
declare global {
  var mongoose: CachedConnection;
}

export {
  dbConnect,
  dbDisconnect,
  getConnectionStatus
};

export default dbConnect;