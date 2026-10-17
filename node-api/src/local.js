import { app } from './app.js';
import { env, validateEnv } from './config/env.js';
import { connectMongo, disconnectMongo } from './db/mongodb.js';

const startServer = async () => {
  try {
    validateEnv();

    // Attempt to connect to MongoDB
    console.info('[Server] Connecting to MongoDB...');
    try {
      await connectMongo();
    } catch (dbErr) {
      console.warn(
        `[Server] Warning: Initial MongoDB connection failed (${dbErr.message}). Server starting in degraded mode.`
      );
    }

    const server = app.listen(env.port, () => {
      console.info(
        `[Server] EntangleX Q-Health Node API running on port ${env.port} (${env.nodeEnv})`
      );
      console.info(`[Server] Health check: http://localhost:${env.port}/health`);
      console.info(
        `[Server] Notes API: http://localhost:${env.port}/api/experiment-notes`
      );
    });

    const gracefulShutdown = async (signal) => {
      console.info(`[Server] Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        console.info('[Server] HTTP server closed.');
        try {
          await disconnectMongo();
          console.info('[Server] MongoDB connection closed.');
        } catch (err) {
          console.error('[Server] Error closing MongoDB connection:', err.message);
        }
        process.exit(0);
      });

      // Force close if graceful shutdown takes too long
      setTimeout(() => {
        console.error('[Server] Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (err) {
    console.error('[Server] Fatal startup error:', err.message);
    process.exit(1);
  }
};

startServer();
