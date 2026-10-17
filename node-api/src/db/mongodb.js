import mongoose from 'mongoose';
import { env } from '../config/env.js';

let cachedConnection = null;
let connectionPromise = null;

const sanitizeMongoUri = (uri) => {
  if (!uri) return '';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
};

export const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const getDbState = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

export const connectMongo = async (uri = env.mongodbUri) => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      const sanitizedUri = sanitizeMongoUri(uri);
      // Bind connection events once
      if (mongoose.connection.listenerCount('disconnected') === 0) {
        mongoose.connection.on('disconnected', () => {
          cachedConnection = null;
          if (!env.isTest) {
            console.warn('[MongoDB] Connection disconnected');
          }
        });
        mongoose.connection.on('reconnected', () => {
          cachedConnection = mongoose;
          if (!env.isTest) {
            console.info('[MongoDB] Connection re-established');
          }
        });
        mongoose.connection.on('error', (err) => {
          if (!env.isTest) {
            console.error('[MongoDB] Connection error:', err.message);
          }
        });
      }

      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: !env.isProduction, // Disable automatic index builds in production for performance
      });

      cachedConnection = conn;
      if (!env.isTest) {
        console.info(`[MongoDB] Successfully connected to ${sanitizedUri}`);
      }
      return conn;
    } catch (error) {
      cachedConnection = null;
      const sanitizedErrorMsg = sanitizeMongoUri(error.message);
      if (!env.isTest) {
        console.error(`[MongoDB] Failed to connect: ${sanitizedErrorMsg}`);
      }
      throw new Error(`Database connection failed: ${sanitizedErrorMsg}`);
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

export const disconnectMongo = async () => {
  if (connectionPromise) {
    try {
      await connectionPromise;
    } catch {
      // ignore
    }
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  cachedConnection = null;
  connectionPromise = null;
};

export const ensureDbConnected = async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      await connectMongo();
    }
    next();
  } catch (error) {
    next(error);
  }
};
