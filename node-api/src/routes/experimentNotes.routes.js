import { Router } from 'express';
import { authenticate as defaultAuth } from '../middleware/auth.js';
import { defaultExperimentNotesController } from '../controllers/experimentNotes.controller.js';

export const createExperimentNotesRouter = ({
  authMiddleware = defaultAuth,
  dbMiddleware = null,
  controller = defaultExperimentNotesController,
} = {}) => {
  const router = Router();

  // All experiment notes routes require authentication before database operations
  router.use(authMiddleware);

  // Establish MongoDB connection before protected CRUD handlers execute
  if (dbMiddleware) {
    router.use(dbMiddleware);
  }

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
};

export const defaultExperimentNotesRouter = createExperimentNotesRouter();
