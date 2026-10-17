import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export const isSupabaseConfigured = () =>
  Boolean(env.supabaseUrl && env.supabaseAnonKey);

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

export const createUserScopedSupabaseClient = (accessToken) => {
  if (!isSupabaseConfigured() || !accessToken?.trim()) return null;

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    ...clientOptions,
    global: {
      headers: { Authorization: `Bearer ${accessToken.trim()}` },
    },
  });
};

export const checkSupabaseConnection = async () => {
  if (!isSupabaseConfigured()) return 'disconnected';

  try {
    const client = createClient(env.supabaseUrl, env.supabaseAnonKey, clientOptions);
    const { error } = await client
      .from('experiment_notes')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    return error ? 'disconnected' : 'connected';
  } catch {
    return 'disconnected';
  }
};
