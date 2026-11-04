import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ExperimentNote } from '../src/models/ExperimentNote.js';
import {
  createNoteSchema,
  updateNoteSchema,
  objectIdSchema,
  queryNotesSchema,
} from '../src/validation/experimentNotes.schema.js';

describe('ExperimentNote Mongoose Model & Schema Validation', () => {
  test('schema requires title, content, and ownerId', () => {
    const paths = ExperimentNote.schema.paths;
    assert.ok(paths.title.isRequired, 'title must be required');
    assert.ok(paths.content.isRequired, 'content must be required');
    assert.ok(paths.ownerId.isRequired, 'ownerId must be required');

    const emptyDoc = new ExperimentNote({});
    const err = emptyDoc.validateSync();
    assert.ok(err, 'Validation must fail for empty document');
    assert.ok(err.errors.title, 'Missing title should trigger validation error');
    assert.ok(err.errors.content, 'Missing content should trigger validation error');
    assert.ok(err.errors.ownerId, 'Missing ownerId should trigger validation error');
  });

  test('schema defines optional fields with defaults', () => {
    const paths = ExperimentNote.schema.paths;
    assert.equal(paths.datasetName.defaultValue, '');
    assert.equal(paths.modelName.defaultValue, '');
    assert.equal(paths.experimentReference.defaultValue, '');
    assert.ok(
      Array.isArray(paths.tags.defaultValue) || typeof paths.tags.defaultValue === 'function'
    );

    const doc = new ExperimentNote({
      title: 'Minimal Note',
      content: 'Minimal content',
      ownerId: 'usr_123',
    });
    assert.equal(doc.validateSync(), undefined);
    assert.equal(doc.datasetName, '');
    assert.equal(doc.modelName, '');
    assert.equal(doc.experimentReference, '');
    assert.deepEqual(Array.from(doc.tags), []);
  });

  test('schema enforces maximum length and tag count constraints', () => {
    const oversizedDoc = new ExperimentNote({
      title: 'T'.repeat(201),
      content: 'C'.repeat(10001),
      datasetName: 'D'.repeat(101),
      modelName: 'M'.repeat(101),
      experimentReference: 'R'.repeat(101),
      tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`),
      ownerId: 'usr_123',
    });

    const err = oversizedDoc.validateSync();
    assert.ok(err);
    assert.ok(err.errors.title);
    assert.ok(err.errors.content);
    assert.ok(err.errors.datasetName);
    assert.ok(err.errors.modelName);
    assert.ok(err.errors.experimentReference);
    assert.ok(err.errors.tags);
  });

  test('schema indexes include ownerId and compound indexes for sorting and filtering', () => {
    const indexes = ExperimentNote.schema.indexes();
    const hasUpdatedAtIdx = indexes.some(
      ([fields]) => fields.ownerId === 1 && fields.updatedAt === -1
    );
    const hasDatasetIdx = indexes.some(
      ([fields]) => fields.ownerId === 1 && fields.datasetName === 1
    );
    const hasModelIdx = indexes.some(
      ([fields]) => fields.ownerId === 1 && fields.modelName === 1
    );
    const hasTagsIdx = indexes.some(([fields]) => fields.ownerId === 1 && fields.tags === 1);
    const hasRefIdx = indexes.some(
      ([fields]) => fields.ownerId === 1 && fields.experimentReference === 1
    );

    assert.ok(hasUpdatedAtIdx, 'Compound index { ownerId: 1, updatedAt: -1 } must be registered');
    assert.ok(hasDatasetIdx, 'Compound index { ownerId: 1, datasetName: 1 } must be registered');
    assert.ok(hasModelIdx, 'Compound index { ownerId: 1, modelName: 1 } must be registered');
    assert.ok(hasTagsIdx, 'Compound index { ownerId: 1, tags: 1 } must be registered');
    assert.ok(
      hasRefIdx,
      'Compound index { ownerId: 1, experimentReference: 1 } must be registered'
    );
  });

  test('toJSON and toObject transforms replace _id with string id and remove __v', () => {
    const doc = new ExperimentNote({
      title: 'Transformation Test',
      content: 'Testing toJSON transform behavior',
      ownerId: 'usr_transform_test',
    });

    const json = doc.toJSON();
    assert.ok(json.id, 'id field must be present');
    assert.equal(typeof json.id, 'string');
    assert.match(json.id, /^[0-9a-fA-F]{24}$/);
    assert.equal(json._id, undefined, '_id should be deleted');
    assert.equal(json.__v, undefined, '__v should be deleted');

    const obj = doc.toObject();
    assert.equal(obj.id, json.id);
    assert.equal(obj._id, undefined);
    assert.equal(obj.__v, undefined);
  });
});

describe('Experiment Notes Zod Validation Schemas', () => {
  test('creation requires a title and content', () => {
    assert.equal(createNoteSchema.safeParse({ title: 'Valid', content: 'Content' }).success, true);
    assert.equal(createNoteSchema.safeParse({ content: 'Missing title' }).success, false);
    assert.equal(createNoteSchema.safeParse({ title: 'Missing content' }).success, false);
  });

  test('rejects client-supplied ownership, IDs, and timestamps', () => {
    assert.equal(
      createNoteSchema.safeParse({
        title: 'Valid',
        content: 'Valid',
        ownerId: 'attacker',
      }).success,
      false
    );
    assert.equal(
      createNoteSchema.safeParse({
        title: 'Valid',
        content: 'Valid',
        _id: '507f1f77bcf86cd799439011',
      }).success,
      false
    );
    assert.equal(updateNoteSchema.safeParse({ updatedAt: '2026-01-01' }).success, false);
  });

  test('IDs must be valid 24-character hexadecimal MongoDB ObjectIds', () => {
    assert.equal(objectIdSchema.safeParse('507f1f77bcf86cd799439011').success, true);
    assert.equal(objectIdSchema.safeParse('000000000000000000000001').success, true);
    assert.equal(objectIdSchema.safeParse('not-an-object-id').success, false);
    assert.equal(objectIdSchema.safeParse('00000000-0000-4000-8000-000000000001').success, false);
  });

  test('updates require at least one mutable field', () => {
    assert.equal(updateNoteSchema.safeParse({ title: 'New title' }).success, true);
    assert.equal(updateNoteSchema.safeParse({}).success, false);
  });

  test('query schema parses pagination defaults and filter strings', () => {
    const parsed = queryNotesSchema.parse({ page: '2', limit: '25', tag: 'quantum' });
    assert.equal(parsed.page, 2);
    assert.equal(parsed.limit, 25);
    assert.equal(parsed.tag, 'quantum');
  });
});
