import { ExperimentNote } from '../models/ExperimentNote.js';

export const createExperimentNotesService = (model = ExperimentNote) => {
  return {
    async createNote(ownerId, data) {
      const { title, content, datasetName, modelName, experimentReference, tags } = data;
      const note = await model.create({
        title,
        content,
        datasetName: datasetName || '',
        modelName: modelName || '',
        experimentReference: experimentReference || '',
        tags: tags || [],
        ownerId,
      });

      return note.toJSON ? note.toJSON() : note;
    },

    async listNotes(ownerId, query = {}) {
      const {
        page = 1,
        limit = 10,
        datasetName,
        modelName,
        experimentReference,
        tag,
        search,
      } = query;

      const filter = { ownerId };

      if (datasetName) {
        filter.datasetName = datasetName;
      }
      if (modelName) {
        filter.modelName = modelName;
      }
      if (experimentReference) {
        filter.experimentReference = experimentReference;
      }
      if (tag) {
        filter.tags = tag;
      }
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;

      const [total, notes] = await Promise.all([
        model.countDocuments(filter),
        model
          .find(filter)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
      ]);

      return {
        notes: notes.map((n) => (n.toJSON ? n.toJSON() : n)),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    },

    async getNoteById(ownerId, noteId) {
      const note = await model.findOne({ _id: noteId, ownerId }).exec();
      if (!note) {
        return null;
      }
      return note.toJSON ? note.toJSON() : note;
    },

    async updateNote(ownerId, noteId, updateData) {
      // Disallow overriding system fields
      const { ownerId: _o, _id: _i, id: _id, createdAt: _c, updatedAt: _u, ...cleanData } =
        updateData;

      const updated = await model
        .findOneAndUpdate(
          { _id: noteId, ownerId },
          { $set: cleanData },
          { new: true, runValidators: true }
        )
        .exec();

      if (!updated) {
        return null;
      }
      return updated.toJSON ? updated.toJSON() : updated;
    },

    async deleteNote(ownerId, noteId) {
      const result = await model.deleteOne({ _id: noteId, ownerId }).exec();
      return result.deletedCount === 1;
    },
  };
};

export const defaultExperimentNotesService = createExperimentNotesService(ExperimentNote);
