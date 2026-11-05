import mongoose from 'mongoose';
import { ExperimentNote } from '../../src/models/ExperimentNote.js';
import { createExperimentNotesService } from '../../src/services/experimentNotes.service.js';

let counter = 1;

export const generateObjectId = () => {
  const hex = (counter++).toString(16).padStart(24, '0');
  return hex;
};

const matchesFilter = (doc, filter = {}) => {
  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or' && Array.isArray(value)) {
      const orMatch = value.some((clause) => matchesFilter(doc, clause));
      if (!orMatch) return false;
      continue;
    }

    if (key === '_id') {
      if (doc._id.toString() !== String(value)) return false;
      continue;
    }

    if (key === 'tags' && typeof value === 'string') {
      if (!Array.isArray(doc.tags) || !doc.tags.includes(value)) return false;
      continue;
    }

    if (value && typeof value === 'object' && '$regex' in value) {
      const regex = new RegExp(value.$regex, value.$options || '');
      if (!regex.test(String(doc[key] || ''))) return false;
      continue;
    }

    if (doc[key] !== value) {
      return false;
    }
  }
  return true;
};

export const createInMemoryMongooseModel = (initialDocs = []) => {
  let docs = [...initialDocs];

  return {
    _getRawDocs: () => docs,
    _setDocs: (newDocs) => {
      docs = [...newDocs];
    },

    async create(data) {
      const now = new Date();
      const doc = new ExperimentNote({
        _id: new mongoose.Types.ObjectId(generateObjectId()),
        ...data,
        createdAt: now,
        updatedAt: now,
      });
      await doc.validate();
      docs.push(doc);
      return doc;
    },

    async countDocuments(filter = {}) {
      return docs.filter((doc) => matchesFilter(doc, filter)).length;
    },

    find(filter = {}) {
      let result = docs.filter((doc) => matchesFilter(doc, filter));
      let skipVal = 0;
      let limitVal = null;

      const queryChain = {
        sort(sortSpec = {}) {
          if (sortSpec.updatedAt) {
            const dir = sortSpec.updatedAt < 0 ? -1 : 1;
            result = [...result].sort(
              (a, b) => dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
            );
          }
          return queryChain;
        },
        skip(n) {
          skipVal = n;
          return queryChain;
        },
        limit(n) {
          limitVal = n;
          return queryChain;
        },
        async exec() {
          const sliced =
            limitVal !== null
              ? result.slice(skipVal, skipVal + limitVal)
              : result.slice(skipVal);
          return sliced;
        },
      };

      return queryChain;
    },

    findOne(filter = {}) {
      return {
        async exec() {
          const found = docs.find((doc) => matchesFilter(doc, filter));
          return found || null;
        },
      };
    },

    findOneAndUpdate(filter = {}, update = {}, options = {}) {
      return {
        async exec() {
          const index = docs.findIndex((doc) => matchesFilter(doc, filter));
          if (index === -1) return null;

          const existing = docs[index];
          const updates = update.$set ? update.$set : update;
          for (const [k, v] of Object.entries(updates)) {
            existing.set(k, v);
          }
          existing.updatedAt = new Date();

          if (options.runValidators) {
            await existing.validate();
          }

          return existing;
        },
      };
    },

    deleteOne(filter = {}) {
      return {
        async exec() {
          const index = docs.findIndex((doc) => matchesFilter(doc, filter));
          if (index === -1) {
            return { acknowledged: true, deletedCount: 0 };
          }
          docs.splice(index, 1);
          return { acknowledged: true, deletedCount: 1 };
        },
      };
    },
  };
};

export const createInMemoryNotesService = (initialNotes = []) => {
  const model = createInMemoryMongooseModel(initialNotes);
  const service = createExperimentNotesService(model);
  return {
    ...service,
    _model: model,
    _getRawNotes: () => model._getRawDocs().map((d) => d.toJSON()),
  };
};
