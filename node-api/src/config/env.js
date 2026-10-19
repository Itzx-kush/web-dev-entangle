import dotenv from 'dotenv';

dotenv.config();

const parseCorsOrigins = (rawOrigins) => {
  if (!rawOrigins) return ['http://localhost:5173', 'http://localhost:3000'];
  return rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
};

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT),
};

export const validateEnv = () => {
  const missing = [];

  if (env.isProduction) {
    if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!process.env.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
    if (!process.env.CORS_ORIGINS) missing.push('CORS_ORIGINS');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missing.join(', ')}`
    );
  }

  if (env.isProduction && env.corsOrigins.includes('*')) {
    throw new Error(
      "Wildcard CORS_ORIGINS ('*') is not allowed in production with credentials enabled"
    );
  }
};
