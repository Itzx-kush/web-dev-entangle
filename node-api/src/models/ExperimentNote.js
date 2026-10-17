import mongoose from 'mongoose';

const experimentNoteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      maxlength: [10000, 'Content cannot exceed 10000 characters'],
    },
    datasetName: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Dataset name cannot exceed 100 characters'],
    },
    modelName: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Model name cannot exceed 100 characters'],
    },
    experimentReference: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Experiment reference cannot exceed 100 characters'],
    },
    tags: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [50, 'Individual tag cannot exceed 50 characters'],
        },
      ],
      default: [],
    },
    ownerId: {
      type: String,
      required: [true, 'Owner ID is required'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for querying user's notes sorted by update time
experimentNoteSchema.index({ ownerId: 1, updatedAt: -1 });
experimentNoteSchema.index({ ownerId: 1, tags: 1 });
experimentNoteSchema.index({ ownerId: 1, experimentReference: 1 });

export const ExperimentNote =
  mongoose.models.ExperimentNote ||
  mongoose.model('ExperimentNote', experimentNoteSchema);
