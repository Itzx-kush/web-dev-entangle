import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env, validateEnv, isValidMongoUri } from '../src/config/env.js';
import {
  connectMongo,
  disconnectMongo,
  ensureDbConnected,
  isDbConnected,
  getDbState,
  sanitizeMongoUri,
} from '../src/db/mongodb.js';
import serverlessHandler from '../api/index.js';
import defaultApp, {
  app as namedApp,
  createApp as namedCreateApp,
  ensureDbConnected as namedEnsureDbConnected,
  ExperimentNote as namedExperimentNote,
} from '../src/index.js';
import { createInMemoryNotesService } from './helpers/inMemoryService.js';

describe('Production Deployment, MongoDB Connection & Serverless Configuration', () => {
  let originalEnvVars;
  let originalIsProduction;
  let originalCorsOrigins;
  let originalMongodbUri;

  beforeEach(() => {
    originalIsProduction = env.isProduction;
    originalCorsOrigins = [...env.corsOrigins];
    originalMongodbUri = env.mongodbUri;
    originalEnvVars = {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      CORS_ORIGINS: process.env.CORS_ORIGINS,
    };
  });

  afterEach(async () => {
    env.isProduction = originalIsProduction;
    env.corsOrigins = originalCorsOrigins;
    env.mongodbUri = originalMongodbUri;
    for (const [key, value] of Object.entries(originalEnvVars)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await disconnectMongo();
  });

  describe('1. Production CORS origin policy & proxy trust', () => {
    test('permits requests from configured production origin with credentials header', async () => {
      env.isProduction = true;
      env.corsOrigins = ['https://entanglex-frontend.vercel.app'];

      const testApp = createApp({
        noteService: createInMemoryNotesService(),
        enableRateLimit: false,
        dbStateFn: () => 'connected',
      });

      const res = await request(testApp)
        .get('/health')
        .set('Origin', 'https://entanglex-frontend.vercel.app');

      assert.equal(res.status, 200);
      assert.equal(
        res.headers['access-control-allow-origin'],
        'https://entanglex-frontend.vercel.app'
      );
      assert.equal(res.headers['access-control-allow-credentials'], 'true');
    });

    test('rejects requests from unpermitted origin with 403 Forbidden in production', async () => {
      env.isProduction = true;
      env.corsOrigins = ['https://entanglex-frontend.vercel.app'];

      const testApp = createApp({
        noteService: createInMemoryNotesService(),
        enableRateLimit: false,
        dbStateFn: () => 'connected',
      });

      const res = await request(testApp)
        .get('/health')
        .set('Origin', 'https://unauthorized-domain.com');

      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'Forbidden');
      assert.ok(res.body.message.includes('Origin is not permitted'));
    });

    test('permits requests with no origin (e.g. server-to-server or health monitoring)', async () => {
      env.isProduction = true;
      env.corsOrigins = ['https://entanglex-frontend.vercel.app'];

      const testApp = createApp({
        noteService: createInMemoryNotesService(),
        enableRateLimit: false,
        dbStateFn: () => 'connected',
      });

      const res = await request(testApp).get('/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
    });

    test('trusts exactly one reverse-proxy hop for rate limiting', () => {
      const testApp = createApp({ enableRateLimit: false });
      assert.equal(testApp.get('trust proxy'), 1);
    });
  });

  describe('2. Production Environment Validation (MONGODB_URI, Supabase Auth, CORS)', () => {
    test('throws in production when required environment variables including MONGODB_URI are missing', () => {
      env.isProduction = true;
      delete process.env.MONGODB_URI;
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;
      delete process.env.CORS_ORIGINS;

      assert.throws(
        () => validateEnv(),
        /Missing required environment variables in production: MONGODB_URI, SUPABASE_URL, SUPABASE_ANON_KEY, CORS_ORIGINS/
      );
    });

    test('validates MONGODB_URI scheme (mongodb:// or mongodb+srv://)', () => {
      assert.equal(isValidMongoUri('mongodb://localhost:27017/entanglex'), true);
      assert.equal(
        isValidMongoUri('mongodb+srv://user:pass@cluster0.mongodb.net/entanglex?retryWrites=true'),
        true
      );
      assert.equal(isValidMongoUri('postgres://localhost:5432/db'), false);
      assert.equal(isValidMongoUri(''), false);

      process.env.MONGODB_URI = 'http://not-a-mongo-uri';
      assert.throws(() => validateEnv(), /Invalid MONGODB_URI format/);
    });

    test('throws in production when wildcard CORS origin is specified with credentials', () => {
      env.isProduction = true;
      process.env.MONGODB_URI = 'mongodb+srv://mock:mock@cluster.mongodb.net/entanglex';
      process.env.SUPABASE_URL = 'https://mock.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
      process.env.CORS_ORIGINS = '*';
      env.corsOrigins = ['*'];

      assert.throws(
        () => validateEnv(),
        /Wildcard CORS_ORIGINS \('\*'\) is not allowed in production with credentials enabled/
      );
    });

    test('passes validation when all required production variables are properly set', () => {
      env.isProduction = true;
      process.env.MONGODB_URI = 'mongodb+srv://mock:mock@cluster.mongodb.net/entanglex';
      process.env.SUPABASE_URL = 'https://mock.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
      process.env.CORS_ORIGINS = 'https://entanglex.vercel.app';
      env.corsOrigins = ['https://entanglex.vercel.app'];

      assert.doesNotThrow(() => validateEnv());
    });
  });

  describe('3. Serverless Entrypoints, Exports & Credential Sanitization', () => {
    test('api/index.js exports default Express application handler for Vercel functions', () => {
      assert.equal(typeof serverlessHandler, 'function');
      assert.ok(serverlessHandler.handle);
    });

    test('src/index.js exports default and named symbols matching contract', () => {
      assert.equal(typeof defaultApp, 'function');
      assert.equal(defaultApp, namedApp);
      assert.equal(typeof namedCreateApp, 'function');
      assert.equal(typeof namedEnsureDbConnected, 'function');
      assert.ok(namedExperimentNote);
    });

    test('db module exports isDbConnected, getDbState, and ensureDbConnected', () => {
      assert.equal(typeof isDbConnected, 'function');
      assert.equal(typeof getDbState, 'function');
      assert.equal(typeof ensureDbConnected, 'function');
      assert.equal(typeof isDbConnected(), 'boolean');
      assert.ok(['disconnected', 'connected', 'connecting', 'disconnecting'].includes(getDbState()));
    });

    test('sanitizeMongoUri redacts full connection strings and credentials from logs/errors', () => {
      const rawError =
        'failed to connect to mongodb+srv://adminUser:SuperSecretPassword123@cluster0.xyz.mongodb.net/entanglex?retryWrites=true';
      const sanitized = sanitizeMongoUri(rawError);
      assert.ok(!sanitized.includes('SuperSecretPassword123'));
      assert.ok(!sanitized.includes('adminUser'));
      assert.ok(!sanitized.includes('cluster0.xyz.mongodb.net'));
      assert.ok(sanitized.includes('[REDACTED_MONGODB_URI]'));
    });
  });

  describe('4. Serverless Connection Reuse & Middleware Ordering', () => {
    test('connectMongo deduplicates concurrent connection attempts and reuses active connection', async () => {
      const originalConnect = mongoose.connect;
      const originalReadyState = mongoose.connection.readyState;
      let connectCallCount = 0;

      mongoose.connect = async () => {
        connectCallCount += 1;
        await new Promise((r) => setTimeout(r, 20));
        Object.defineProperty(mongoose.connection, 'readyState', {
          value: 1,
          configurable: true,
        });
        return mongoose;
      };

      try {
        // Trigger two simultaneous connection calls
        const [conn1, conn2] = await Promise.all([
          connectMongo('mongodb+srv://user:pass@cluster.mongodb.net/entanglex'),
          connectMongo('mongodb+srv://user:pass@cluster.mongodb.net/entanglex'),
        ]);
        assert.equal(conn1, conn2);
        assert.equal(connectCallCount, 1, 'Concurrent calls must share one connection attempt');

        // Subsequent call while connected reuses cached connection
        const conn3 = await connectMongo('mongodb+srv://user:pass@cluster.mongodb.net/entanglex');
        assert.equal(conn3, conn1);
        assert.equal(connectCallCount, 1, 'Cached connection must be reused without reconnecting');
      } finally {
        mongoose.connect = originalConnect;
        Object.defineProperty(mongoose.connection, 'readyState', {
          value: originalReadyState,
          configurable: true,
        });
      }
    });

    test('ensureDbConnected immediately calls next() without reconnection when DB is already connected', async () => {
      let nextCalled = false;
      let passedError = null;

      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 1,
        configurable: true,
      });

      try {
        await ensureDbConnected({}, {}, (err) => {
          nextCalled = true;
          passedError = err;
        });
        assert.equal(nextCalled, true);
        assert.equal(passedError, undefined);
      } finally {
        Object.defineProperty(mongoose.connection, 'readyState', {
          value: originalReadyState,
          configurable: true,
        });
      }
    });

    test('authentication executes BEFORE database connection middleware on protected routes', async () => {
      let dbMiddlewareCalled = false;
      const trackingDbMiddleware = (req, res, next) => {
        dbMiddlewareCalled = true;
        next();
      };

      const testApp = createApp({
        noteService: createInMemoryNotesService(),
        authVerifier: async (token) => (token === 'valid-token' ? { id: 'usr_1' } : null),
        dbMiddleware: trackingDbMiddleware,
        enableRateLimit: false,
      });

      // Unauthenticated request must be rejected with 401 before touching DB middleware
      const unauthRes = await request(testApp).get('/api/experiment-notes');
      assert.equal(unauthRes.status, 401);
      assert.equal(
        dbMiddlewareCalled,
        false,
        'Database middleware must not execute for unauthenticated requests'
      );

      // Authenticated request executes DB middleware before controller
      const authRes = await request(testApp)
        .get('/api/experiment-notes')
        .set('Authorization', 'Bearer valid-token');
      assert.equal(authRes.status, 200);
      assert.equal(
        dbMiddlewareCalled,
        true,
        'Database middleware must execute for authenticated requests before controller'
      );
    });

    test('returns 503 Service Unavailable when ensureDbConnected fails to connect to MongoDB', async () => {
      const failingDbMiddleware = (req, res, next) => {
        const err = new Error('Database connection failed: [REDACTED_MONGODB_URI]');
        err.name = 'MongooseServerSelectionError';
        err.status = 503;
        next(err);
      };

      const testApp = createApp({
        noteService: createInMemoryNotesService(),
        authVerifier: async () => ({ id: 'usr_1' }),
        dbMiddleware: failingDbMiddleware,
        enableRateLimit: false,
      });

      const res = await request(testApp)
        .get('/api/experiment-notes')
        .set('Authorization', 'Bearer valid-token');

      assert.equal(res.status, 503);
      assert.equal(res.body.error, 'Service Unavailable');
    });
  });
});
