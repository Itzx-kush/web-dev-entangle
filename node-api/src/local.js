import { app } from './app.js';
import { env, validateEnv } from './config/env.js';

const startServer = async () => {
  try {
    validateEnv();

    const server = app.listen(env.port, () => {
      console.info(`[Server] EntangleX Q-Health Node API running on port ${env.port} (${env.nodeEnv})`);
      console.info(`[Server] Health check: http://localhost:${env.port}/health`);
      console.info(`[Server] Notes API: http://localhost:${env.port}/api/experiment-notes`);
    });

    const gracefulShutdown = (signal) => {
      console.info(`[Server] Received ${signal}. Starting graceful shutdown...`);
      server.close(() => {
        console.info('[Server] HTTP server closed.');
        process.exit(0);
      });
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
