import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env, validateEnv } from '../src/config/env.js';
import { createUserScopedSupabaseClient, isSupabaseConfigured } from '../src/db/supabase.js';
import serverlessHandler from '../api/index.js';
import defaultApp, { app as namedApp, createApp as namedCreateApp } from '../src/index.js';
import { createInMemoryNotesService } from './helpers/inMemoryService.js';

describe('Production Deployment & Serverless Configuration', () => {
  let originalEnv;
  let originalIsProduction;
  let originalCorsOrigins;
  let originalSupabaseUrl;
  let originalSupabaseAnonKey;

  beforeEach(() => {
    originalEnv = Object.fromEntries(['NODE_ENV', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'CORS_ORIGINS']
      .map((key) => [key, process.env[key]]));
    originalIsProduction = env.isProduction;
    originalCorsOrigins = [...env.corsOrigins];
    originalSupabaseUrl = env.supabaseUrl;
    originalSupabaseAnonKey = env.supabaseAnonKey;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    env.isProduction = originalIsProduction;
    env.corsOrigins = originalCorsOrigins;
    env.supabaseUrl = originalSupabaseUrl;
    env.supabaseAnonKey = originalSupabaseAnonKey;
  });

  test('allows configured production origins and rejects untrusted origins', async () => {
    env.isProduction = true;
    env.corsOrigins = ['https://entanglex.example'];
    const testApp = createApp({
      noteService: createInMemoryNotesService(),
      enableRateLimit: false,
      dbStateFn: async () => 'connected',
    });

    const allowed = await request(testApp).get('/health').set('Origin', 'https://entanglex.example');
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers['access-control-allow-origin'], 'https://entanglex.example');

    const denied = await request(testApp).get('/health').set('Origin', 'https://evil.example');
    assert.equal(denied.status, 403);
    assert.equal(denied.body.error, 'Forbidden');
  });

  test('health endpoint stays responsive and reports the injected database status', async () => {
    const testApp = createApp({
      noteService: createInMemoryNotesService(),
      enableRateLimit: false,
      dbStateFn: async () => 'disconnected',
    });
    const res = await request(testApp).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database, 'disconnected');
  });

  test('production validation requires Supabase URL, anon key, and an explicit CORS allowlist', () => {
    env.isProduction = true;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.CORS_ORIGINS;
    assert.throws(
      () => validateEnv(),
      /Missing required environment variables in production: SUPABASE_URL, SUPABASE_ANON_KEY, CORS_ORIGINS/
    );
  });

  test('production validation rejects wildcard CORS', () => {
    env.isProduction = true;
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'public-anon-key';
    process.env.CORS_ORIGINS = '*';
    env.corsOrigins = ['*'];
    assert.throws(() => validateEnv(), /Wildcard CORS_ORIGINS/);
  });

  test('production validation passes with required Supabase settings', () => {
    env.isProduction = true;
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'public-anon-key';
    process.env.CORS_ORIGINS = 'https://entanglex.example';
    env.corsOrigins = ['https://entanglex.example'];
    assert.doesNotThrow(() => validateEnv());
  });

  test('serverless entrypoint exports an Express application', () => {
    assert.equal(typeof serverlessHandler, 'function');
    assert.ok(serverlessHandler.handle);
    assert.equal(typeof defaultApp, 'function');
    assert.equal(defaultApp, namedApp);
    assert.equal(typeof namedCreateApp, 'function');
  });

  test('user-scoped database client requires a Supabase URL and anon key', () => {
    env.supabaseUrl = '';
    env.supabaseAnonKey = '';
    assert.equal(isSupabaseConfigured(), false);
    assert.equal(createUserScopedSupabaseClient('test-user-token'), null);
  });
});
