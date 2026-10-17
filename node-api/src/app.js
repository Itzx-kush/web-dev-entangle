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

export const createApp = ({
  noteService = defaultExperimentNotesService,
  authVerifier = null,
  authMiddleware = null,
  dbStateFn = undefined,
  enableRateLimit = !env.isTest,
} = {}) => {
  const app = express();

  app.use(helmet());

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

  app.use(express.json({ limit: '1mb' }));

  if (enableRateLimit) {
    app.use('/api/', rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded, please try again later.',
      },
    }));
  }

  const healthRouter = createHealthRouter(dbStateFn);
  app.use('/health', healthRouter);
  app.use('/api/health', healthRouter);

  let auth = authMiddleware;
  if (!auth) auth = authVerifier ? createAuthMiddleware(authVerifier) : undefined;

  const controller = createExperimentNotesController(noteService);
  const notesRouter = createExperimentNotesRouter({ authMiddleware: auth, controller });
  app.use('/api/experiment-notes', notesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

export const app = createApp();
export default app;
