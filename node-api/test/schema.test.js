import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createNoteSchema, updateNoteSchema, objectIdSchema } from '../src/validation/experimentNotes.schema.js';

describe('Experiment Notes validation schemas', () => {
  test('creation requires a title and content', () => {
    assert.equal(createNoteSchema.safeParse({ title: 'Valid', content: 'Content' }).success, true);
    assert.equal(createNoteSchema.safeParse({ content: 'Missing title' }).success, false);
    assert.equal(createNoteSchema.safeParse({ title: 'Missing content' }).success, false);
  });

  test('rejects client-supplied ownership and timestamps', () => {
    assert.equal(createNoteSchema.safeParse({
      title: 'Valid', content: 'Valid', ownerId: 'attacker',
    }).success, false);
    assert.equal(updateNoteSchema.safeParse({ updatedAt: '2026-01-01' }).success, false);
  });

  test('IDs must be valid UUIDs', () => {
    assert.equal(objectIdSchema.safeParse('00000000-0000-4000-8000-000000000001').success, true);
    assert.equal(objectIdSchema.safeParse('not-a-uuid').success, false);
  });

  test('updates require at least one mutable field', () => {
    assert.equal(updateNoteSchema.safeParse({ title: 'New title' }).success, true);
    assert.equal(updateNoteSchema.safeParse({}).success, false);
  });
});
