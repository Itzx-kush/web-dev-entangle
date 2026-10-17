import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ExperimentNote } from '../src/models/ExperimentNote.js';

describe('ExperimentNote Mongoose Schema', () => {
  test('schema requires title, content, and ownerId', () => {
    const paths = ExperimentNote.schema.paths;
    assert.ok(paths.title.isRequired, 'title must be required');
    assert.ok(paths.content.isRequired, 'content must be required');
    assert.ok(paths.ownerId.isRequired, 'ownerId must be required');
  });

  test('schema defines optional fields with defaults', () => {
    const paths = ExperimentNote.schema.paths;
    assert.equal(paths.datasetName.defaultValue, '');
    assert.equal(paths.modelName.defaultValue, '');
    assert.equal(paths.experimentReference.defaultValue, '');
    assert.ok(Array.isArray(paths.tags.defaultValue) || typeof paths.tags.defaultValue === 'function');
  });

  test('schema indexes include compound ownerId and updatedAt index', () => {
    const indexes = ExperimentNote.schema.indexes();
    const compoundIndexExists = indexes.some(([fields]) => {
      return fields.ownerId === 1 && fields.updatedAt === -1;
    });
    assert.ok(compoundIndexExists, 'Compound index { ownerId: 1, updatedAt: -1 } must be registered');
  });

  test('toJSON transform replaces _id with string id and removes __v', () => {
    const doc = new ExperimentNote({
      title: 'Transformation Test',
      content: 'Testing toJSON transform behavior',
      ownerId: 'usr_transform_test',
    });

    const json = doc.toJSON();
    assert.ok(json.id, 'id field must be present');
    assert.equal(typeof json.id, 'string');
    assert.equal(json._id, undefined, '_id should be deleted');
    assert.equal(json.__v, undefined, '__v should be deleted');
  });
});
