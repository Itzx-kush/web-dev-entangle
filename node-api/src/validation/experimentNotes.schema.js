import { z } from 'zod';

const FORBIDDEN_FIELDS = ['ownerId', '_id', 'id', 'createdAt', 'updatedAt'];

const checkForbiddenFields = (data, ctx) => {
  for (const field of FORBIDDEN_FIELDS) {
    if (field in data) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Field '${field}' cannot be specified in the request body`,
        path: [field],
      });
    }
  }
};

export const objectIdSchema = z.string().trim().uuid({
  message: 'Invalid ID format: must be a valid UUID',
});

export const createNoteSchema = z
  .object({
    title: z.string({ required_error: 'Title is required' }).trim()
      .min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters'),
    content: z.string({ required_error: 'Content is required' }).trim()
      .min(1, 'Content cannot be empty').max(10000, 'Content cannot exceed 10000 characters'),
    datasetName: z.string().trim().max(100, 'Dataset name cannot exceed 100 characters')
      .optional().default(''),
    modelName: z.string().trim().max(100, 'Model name cannot exceed 100 characters')
      .optional().default(''),
    experimentReference: z.string().trim().max(100, 'Experiment reference cannot exceed 100 characters')
      .optional().default(''),
    tags: z.array(z.string().trim().max(50, 'Individual tag cannot exceed 50 characters'))
      .max(20, 'Maximum of 20 tags allowed').optional().default([]),
  })
  .passthrough()
  .superRefine(checkForbiddenFields);

export const updateNoteSchema = z
  .object({
    title: z.string().trim().min(1, 'Title cannot be empty')
      .max(200, 'Title cannot exceed 200 characters').optional(),
    content: z.string().trim().min(1, 'Content cannot be empty')
      .max(10000, 'Content cannot exceed 10000 characters').optional(),
    datasetName: z.string().trim().max(100, 'Dataset name cannot exceed 100 characters').optional(),
    modelName: z.string().trim().max(100, 'Model name cannot exceed 100 characters').optional(),
    experimentReference: z.string().trim().max(100, 'Experiment reference cannot exceed 100 characters').optional(),
    tags: z.array(z.string().trim().max(50, 'Individual tag cannot exceed 50 characters'))
      .max(20, 'Maximum of 20 tags allowed').optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    checkForbiddenFields(data, ctx);
    const validFields = ['title', 'content', 'datasetName', 'modelName', 'experimentReference', 'tags'];
    if (!validFields.some((field) => field in data && data[field] !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one valid field must be provided for update',
      });
    }
  });

export const queryNotesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  datasetName: z.string().trim().optional(),
  modelName: z.string().trim().optional(),
  experimentReference: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  search: z.string().trim().optional(),
});
