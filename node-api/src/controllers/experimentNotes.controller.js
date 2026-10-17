import {
  createNoteSchema,
  updateNoteSchema,
  queryNotesSchema,
  objectIdSchema,
} from '../validation/experimentNotes.schema.js';
import { defaultExperimentNotesService } from '../services/experimentNotes.service.js';

export const createExperimentNotesController = (
  service = defaultExperimentNotesService
) => {
  return {
    async create(req, res, next) {
      try {
        const validated = createNoteSchema.parse(req.body);
        const note = await service.createNote(req.user.id, validated, req.supabase);
        return res.status(201).json(note);
      } catch (err) {
        return next(err);
      }
    },

    async list(req, res, next) {
      try {
        const query = queryNotesSchema.parse(req.query);
        const result = await service.listNotes(req.user.id, query, req.supabase);
        return res.status(200).json({
          notes: result.notes,
          data: result.notes,
          pagination: result.pagination,
        });
      } catch (err) {
        return next(err);
      }
    },

    async getById(req, res, next) {
      try {
        const id = objectIdSchema.parse(req.params.id);
        const note = await service.getNoteById(req.user.id, id, req.supabase);
        if (!note) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Experiment note not found',
          });
        }
        return res.status(200).json(note);
      } catch (err) {
        return next(err);
      }
    },

    async update(req, res, next) {
      try {
        const id = objectIdSchema.parse(req.params.id);
        const updateData = updateNoteSchema.parse(req.body);
        const updatedNote = await service.updateNote(req.user.id, id, updateData, req.supabase);
        if (!updatedNote) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Experiment note not found',
          });
        }
        return res.status(200).json(updatedNote);
      } catch (err) {
        return next(err);
      }
    },

    async remove(req, res, next) {
      try {
        const id = objectIdSchema.parse(req.params.id);
        const deleted = await service.deleteNote(req.user.id, id, req.supabase);
        if (!deleted) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Experiment note not found',
          });
        }
        return res.status(200).json({
          message: 'Experiment note deleted successfully',
        });
      } catch (err) {
        return next(err);
      }
    },
  };
};

export const defaultExperimentNotesController = createExperimentNotesController(
  defaultExperimentNotesService
);
