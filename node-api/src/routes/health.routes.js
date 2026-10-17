import { Router } from 'express';
import { getDbState } from '../db/mongodb.js';

export const createHealthRouter = (dbStateFn = getDbState) => {
  const router = Router();

  router.get('/', (req, res) => {
    const dbStatus = dbStateFn();
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
    });
  });

  return router;
};

export const defaultHealthRouter = createHealthRouter(getDbState);
