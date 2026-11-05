import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createExperimentNotesRouter } from './routes/experimentNotes.routes.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createExperimentNotesController } from './controllers/experimentNotes.controller.js';
import { defaultExperimentNotesService } from './services/experimentNotes.service.js';
import { ensureDbConnected } from './db/mongodb.js';

export const createApp = ({
  noteService = defaultExperimentNotesService,
  authVerifier = null,
  authMiddleware = null,
  dbStateFn = undefined,
  enableRateLimit = !env.isTest,
  ensureDb = false,
  dbMiddleware = null,
} = {}) => {
  const app = express();

  // The application runs behind a single platform reverse-proxy hop. Trust only
  // that hop so express-rate-limit can use the forwarded client IP safely.
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (env.isProduction) {
          if (env.corsOrigins.includes(origin)) return callback(null, true);
          return callback(new Error('Not allowed by CORS'));
        }
        if (env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parser
  app.use(express.json({ limit: '1mb' }));

  // Rate limiting for general API requests (disabled in test suite)
  if (enableRateLimit) {
    app.use(
      '/api/',
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 200,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded, please try again later.',
        },
      })
    );
  }

  // Health check routes (available at both /health and /api/health)
  const healthRouter = createHealthRouter(dbStateFn);
  app.use('/health', healthRouter);
  app.use('/api/health', healthRouter);

  // Authentication middleware resolution
  let auth = authMiddleware;
  if (!auth) {
    auth = authVerifier ? createAuthMiddleware(authVerifier) : undefined;
  }

  const controller = createExperimentNotesController(noteService);
  const resolvedDbMiddleware = dbMiddleware || (ensureDb ? ensureDbConnected : null);
  const notesRouter = createExperimentNotesRouter({
    authMiddleware: auth,
    dbMiddleware: resolvedDbMiddleware,
    controller,
  });

  app.use('/api/experiment-notes', notesRouter);

  // 404 handler for unknown routes
  app.use(notFoundHandler);

  // Centralized error handler
  app.use(errorHandler);

  return app;
};

export const app = createApp({ ensureDb: true });
export default app;
