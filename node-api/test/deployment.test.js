import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env, validateEnv } from '../src/config/env.js';
import {
  ensureDbConnected,
  isDbConnected,
  getDbState,
  disconnectMongo,
} from '../src/db/mongodb.js';
import serverlessHandler from '../api/index.js';
import defaultApp, {
  app as namedApp,
  createApp as namedCreateApp,
  ensureDbConnected as namedEnsureDbConnected,
} from '../src/index.js';
import { createInMemoryNotesService } from './helpers/inMemoryService.js';

describe('Production Deployment & Serverless Configuration', () => {
  let originalIsProduction;
  let originalCorsOrigins;
  let originalEnvVars;

  beforeEach(() => {
    originalIsProduction = env.isProduction;
    originalCorsOrigins = [...env.corsOrigins];
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
    Object.assign(process.env, originalEnvVars);
    await disconnectMongo();
  });

  describe('1. Production CORS origin policy', () => {
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
  });

  describe('2. Production Environment Validation', () => {
    test('throws in production when required environment variables are missing', () => {
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

  describe('3. Serverless Entrypoints and Exports', () => {
    test('api/index.js exports default Express application handler for Vercel functions', () => {
      assert.equal(typeof serverlessHandler, 'function');
      assert.ok(serverlessHandler.handle); // Express application signature
    });

    test('src/index.js exports default and named symbols matching contract', () => {
      assert.equal(typeof defaultApp, 'function');
      assert.equal(defaultApp, namedApp);
      assert.equal(typeof namedCreateApp, 'function');
      assert.equal(typeof namedEnsureDbConnected, 'function');
    });

    test('db module exports isDbConnected, getDbState, and ensureDbConnected', () => {
      assert.equal(typeof isDbConnected, 'function');
      assert.equal(typeof getDbState, 'function');
      assert.equal(typeof ensureDbConnected, 'function');
      assert.equal(typeof isDbConnected(), 'boolean');
      assert.ok(['disconnected', 'connected', 'connecting', 'disconnecting'].includes(getDbState()));
    });
  });

  describe('4. Database Connection Middleware', () => {
    test('ensureDbConnected immediately calls next() without reconnection when DB is already connected', async () => {
      let nextCalled = false;
      let passedError = null;

      const dummyReq = {};
      const dummyRes = {};
      const nextFn = (err) => {
        nextCalled = true;
        passedError = err;
      };

      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 1,
        configurable: true,
      });

      try {
        await ensureDbConnected(dummyReq, dummyRes, nextFn);
        assert.equal(nextCalled, true);
        assert.equal(passedError, undefined);
      } finally {
        Object.defineProperty(mongoose.connection, 'readyState', {
          value: originalReadyState,
          configurable: true,
        });
      }
    });
  });
});
