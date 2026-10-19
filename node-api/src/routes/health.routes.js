import { Router } from 'express';
import { checkSupabaseConnection } from '../db/supabase.js';

export const createHealthRouter = (dbStateFn = checkSupabaseConnection) => {
  const router = Router();

  router.get('/', async (req, res) => {
    const dbStatus = await dbStateFn();
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
    });
  });

  return router;
};

export const defaultHealthRouter = createHealthRouter(checkSupabaseConnection);
