import dotenv from 'dotenv';

// Load environment variables from .env file if available
dotenv.config();

const parseCorsOrigins = (rawOrigins) => {
  if (!rawOrigins) {
    return ['http://localhost:5173', 'http://localhost:3000'];
  }
  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/entanglex',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT),
};

export const validateEnv = () => {
  const missing = [];

  if (env.isProduction) {
    if (!process.env.MONGODB_URI) {
      missing.push('MONGODB_URI');
    }
    if (!process.env.SUPABASE_URL) {
      missing.push('SUPABASE_URL');
    }
    if (!process.env.SUPABASE_ANON_KEY) {
      missing.push('SUPABASE_ANON_KEY');
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missing.join(', ')}`
    );
  }
};
