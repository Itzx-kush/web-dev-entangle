import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { createUserScopedSupabaseClient } from '../db/supabase.js';

let supabaseClient = null;

const getSupabaseClient = () => {
  if (!supabaseClient && env.supabaseUrl && env.supabaseAnonKey) {
    supabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return supabaseClient;
};

export const defaultTokenVerifier = async (token) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  return {
    id: data.user.id,
    email: data.user.email,
  };
};

export const createAuthMiddleware = (verifier = defaultTokenVerifier) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing or malformed Authorization header. Expected Bearer token.',
        });
      }

      const token = authHeader.slice(7).trim();
      if (!token) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Empty Bearer token provided.',
        });
      }

      const user = await verifier(token);
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired authentication token.',
        });
      }

      req.user = user;
      // Forward only the verified user's JWT to Postgres so RLS is evaluated as
      // that user. No service-role key or client-supplied owner ID is used.
      req.supabase = createUserScopedSupabaseClient(token);
      return next();
    } catch (err) {
      if (err.message === 'Supabase client is not configured') {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Authentication service is not properly configured.',
        });
      }

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication failed.',
      });
    }
  };
};

export const authenticate = createAuthMiddleware(defaultTokenVerifier);
