import { Router } from 'express';
import { authenticate as defaultAuth } from '../middleware/auth.js';
import { defaultExperimentNotesController } from '../controllers/experimentNotes.controller.js';

export const createExperimentNotesRouter = ({
  authMiddleware = defaultAuth,
  controller = defaultExperimentNotesController,
} = {}) => {
  const router = Router();

  // All experiment notes routes require authentication
  router.use(authMiddleware);

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
};

export const defaultExperimentNotesRouter = createExperimentNotesRouter();
