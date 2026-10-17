import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  createInMemoryNotesService,
  generateObjectId,
} from './helpers/inMemoryService.js';
import {
  createNoteSchema,
  updateNoteSchema,
  objectIdSchema,
} from '../src/validation/experimentNotes.schema.js';

describe('Experiment Notes API Test Suite', () => {
  const user1 = { id: 'usr_user1_test_id', email: 'user1@example.com' };
  const user2 = { id: 'usr_user2_test_id', email: 'user2@example.com' };

  // Mock auth verifier for testing
  const mockAuthVerifier = async (token) => {
    if (token === 'valid-user1-token') {
      return user1;
    }
    if (token === 'valid-user2-token') {
      return user2;
    }
    return null;
  };

  let service;
  let app;

  beforeEach(() => {
    service = createInMemoryNotesService();
    app = createApp({
      noteService: service,
      authVerifier: mockAuthVerifier,
      dbStateFn: () => 'connected',
      enableRateLimit: false,
    });
  });

  // Scenario 1: Health endpoint returns 200 and expected payload format
  describe('1. Health Check Endpoint', () => {
    test('GET /health returns 200 with status, database state, and uptime', async () => {
      const res = await request(app).get('/health');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.database, 'connected');
      assert.equal(typeof res.body.uptime, 'number');
      assert.ok(res.body.timestamp);
    });

    test('GET /api/health also returns 200', async () => {
      const res = await request(app).get('/api/health');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
    });

    test('GET /health correctly reflects disconnected state', async () => {
      const disconnectedApp = createApp({
        noteService: service,
        authVerifier: mockAuthVerifier,
        dbStateFn: () => 'disconnected',
        enableRateLimit: false,
      });

      const res = await request(disconnectedApp).get('/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.database, 'disconnected');
    });
  });

  // Scenario 2: Authenticated user can create a note with valid payload
  describe('2. Note Creation (Authenticated)', () => {
    test('POST /api/experiment-notes creates note and returns 201 with ownerId matching session', async () => {
      const payload = {
        title: 'Quantum Variational Classifier Baseline',
        content: 'Evaluated accuracy across 50 iterations on dataset Q-Health-v1.',
        datasetName: 'Q-Health-v1',
        modelName: 'QuantumClassifier',
        experimentReference: 'exp-qhc-001',
        tags: ['quantum', 'baseline', 'v1'],
      };

      const res = await request(app)
        .post('/api/experiment-notes')
        .set('Authorization', 'Bearer valid-user1-token')
        .send(payload);

      assert.equal(res.status, 201);
      assert.ok(res.body.id);
      assert.equal(res.body.title, payload.title);
      assert.equal(res.body.content, payload.content);
      assert.equal(res.body.datasetName, payload.datasetName);
      assert.equal(res.body.modelName, payload.modelName);
      assert.equal(res.body.experimentReference, payload.experimentReference);
      assert.deepEqual(res.body.tags, payload.tags);
      assert.equal(res.body.ownerId, user1.id);
      assert.ok(res.body.createdAt);
      assert.ok(res.body.updatedAt);
    });
  });

  // Scenario 3: Unauthenticated request to protected endpoints returns 401
  describe('3. Authentication Enforcement', () => {
    test('POST /api/experiment-notes returns 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .post('/api/experiment-notes')
        .send({ title: 'Test', content: 'Test' });

      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'Unauthorized');
    });

    test('GET /api/experiment-notes returns 401 when token is invalid or expired', async () => {
      const res = await request(app)
        .get('/api/experiment-notes')
        .set('Authorization', 'Bearer invalid-expired-token');

      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'Unauthorized');
    });

    test('GET /api/experiment-notes/:id returns 401 when header format is not Bearer', async () => {
      const res = await request(app)
        .get(`/api/experiment-notes/${generateObjectId()}`)
        .set('Authorization', 'Basic dXNlcjpwYXNz');

      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'Unauthorized');
    });
  });

  // Scenario 4: Note creation fails with 400 when title or content is missing or exceeds limits
  describe('4. Input Validation on Note Creation', () => {
    test('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/experiment-notes')
        .set('Authorization', 'Bearer valid-user1-token')
        .send({ content: 'Note content without a title' });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation Error');
      assert.ok(res.body.details.some((d) => d.path === 'title'));
    });

    test('returns 400 when content is empty string', async () => {
      const res = await request(app)
        .post('/api/experiment-notes')
        .set('Authorization', 'Bearer valid-user1-token')
        .send({ title: 'Valid Title', content: '   ' });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation Error');
    });

    test('returns 400 when title exceeds 200 characters', async () => {
      const res = await request(app)
        .post('/api/experiment-notes')
        .set('Authorization', 'Bearer valid-user1-token')
        .send({ title: 'A'.repeat(201), content: 'Valid content' });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation Error');
    });

    test('returns 400 when content exceeds 10000 characters', async () => {
      const res = await request(app)
        .post('/api/experiment-notes')
        .set('Authorization', 'Bearer valid-user1-token')
        .send({ title: 'Valid Title', content: 'A'.repeat(10001) });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation Error');
    });

    test('returns 400 when client attempts to inject ownerId in creation payload', async () => {
      const res = await request(app)
        .post('/api/experiment-notes')
        .set('Authorization', 'Bearer valid-user1-token')
        .send({
          title: 'Tampered Note',
          content: 'Trying to impersonate user2',
          ownerId: 'usr_user2_test_id',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation Error');
      assert.ok(res.body.details.some((d) => d.path === 'ownerId'));
    });
  });

  // Scenario 5: Pagination works as expected
  describe('5. Pagination and Listing', () => {
    beforeEach(async () => {
      // Seed 15 notes for user 1
      for (let i = 1; i <= 15; i++) {
        await service.createNote(user1.id, {
          title: `Note #${i}`,
          content: `Content for note ${i}`,
          datasetName: i % 2 === 0 ? 'Dataset-Even' : 'Dataset-Odd',
          tags: [`tag-${i}`],
        });
      }
    });

    test('GET /api/experiment-notes returns page 1 with default limit 10', async () => {
      const res = await request(app)
        .get('/api/experiment-notes')
        .set('Authorization', 'Bearer valid-user1-token');

      assert.equal(res.status, 200);
      assert.equal(res.body.notes.length, 10);
      assert.equal(res.body.pagination.page, 1);
      assert.equal(res.body.pagination.limit, 10);
      assert.equal(res.body.pagination.total, 15);
      assert.equal(res.body.pagination.totalPages, 2);
    });

    test('GET /api/experiment-notes?page=2&limit=10 returns remaining 5 notes', async () => {
      const res = await request(app)
        .get('/api/experiment-notes?page=2&limit=10')
        .set('Authorization', 'Bearer valid-user1-token');

      assert.equal(res.status, 200);
      assert.equal(res.body.notes.length, 5);
      assert.equal(res.body.pagination.page, 2);
    });

    test('filters notes by datasetName correctly', async () => {
      const res = await request(app)
        .get('/api/experiment-notes?datasetName=Dataset-Even')
        .set('Authorization', 'Bearer valid-user1-token');

      assert.equal(res.status, 200);
      assert.equal(res.body.pagination.total, 7);
      res.body.notes.forEach((note) => {
        assert.equal(note.datasetName, 'Dataset-Even');
      });
    });
  });

  // Scenario 6: Authenticated user can fetch their own note by ID
  describe('6. Fetch Single Note', () => {
    test('GET /api/experiment-notes/:id returns 200 and the note', async () => {
      const created = await service.createNote(user1.id, {
        title: 'Single Note Test',
        content: 'Detailed observation',
      });

      const res = await request(app)
        .get(`/api/experiment-notes/${created.id}`)
        .set('Authorization', 'Bearer valid-user1-token');

      assert.equal(res.status, 200);
      assert.equal(res.body.id, created.id);
      assert.equal(res.body.title, 'Single Note Test');
      assert.equal(res.body.content, 'Detailed observation');
      assert.equal(res.body.ownerId, user1.id);
    });
  });

  // Scenario 7: Authenticated user can patch allowed fields
  describe('7. Update Allowed Fields', () => {
    test('PATCH /api/experiment-notes/:id updates allowed fields and returns 200', async () => {
      const created = await service.createNote(user1.id, {
        title: 'Original Title',
        content: 'Original Content',
        tags: ['initial'],
      });

      const patchPayload = {
        title: 'Updated Title',
        content: 'Updated Content after re-evaluating metrics',
        tags: ['updated', 'verified'],
      };

      const res = await request(app)
        .patch(`/api/experiment-notes/${created.id}`)
        .set('Authorization', 'Bearer valid-user1-token')
        .send(patchPayload);

      assert.equal(res.status, 200);
      assert.equal(res.body.id, created.id);
      assert.equal(res.body.title, 'Updated Title');
      assert.equal(res.body.content, 'Updated Content after re-evaluating metrics');
      assert.deepEqual(res.body.tags, ['updated', 'verified']);
    });
  });

  // Scenario 8: Attempting to patch forbidden fields is rejected with 400
  describe('8. Forbidden Fields Rejection on Update', () => {
    test('returns 400 when attempting to update ownerId', async () => {
      const created = await service.createNote(user1.id, {
        title: 'Original',
        content: 'Original',
      });

      const res = await request(app)
        .patch(`/api/experiment-notes/${created.id}`)
        .set('Authorization', 'Bearer valid-user1-token')
        .send({ ownerId: 'usr_malicious_takeover' });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation Error');
      assert.ok(res.body.details.some((d) => d.path === 'ownerId'));
    });

    test('returns 400 when attempting to update _id or id', async () => {
      const created = await service.createNote(user1.id, {
        title: 'Original',
        content: 'Original',
      });

      const res = await request(app)
        .patch(`/api/experiment-notes/${created.id}`)
        .set('Authorization', 'Bearer valid-user1-token')
        .send({ id: generateObjectId() });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation Error');
    });

    test('returns 400 when update payload contains no valid fields', async () => {
      const created = await service.createNote(user1.id, {
        title: 'Original',
        content: 'Original',
      });

      const res = await request(app)
        .patch(`/api/experiment-notes/${created.id}`)
        .set('Authorization', 'Bearer valid-user1-token')
        .send({});

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation Error');
    });
  });

  // Scenario 9: Authenticated user can delete their note
  describe('9. Note Deletion', () => {
    test('DELETE /api/experiment-notes/:id deletes note and subsequent read returns 404', async () => {
      const created = await service.createNote(user1.id, {
        title: 'Note to be deleted',
        content: 'Will be removed soon',
      });

      const deleteRes = await request(app)
        .delete(`/api/experiment-notes/${created.id}`)
        .set('Authorization', 'Bearer valid-user1-token');

      assert.equal(deleteRes.status, 200);

      // Verify subsequent GET returns 404
      const getRes = await request(app)
        .get(`/api/experiment-notes/${created.id}`)
        .set('Authorization', 'Bearer valid-user1-token');

      assert.equal(getRes.status, 404);
      assert.equal(getRes.body.error, 'Not Found');
    });
  });

  // Scenario 10: Malformed ID returns 400 Bad Request
  describe('10. Malformed ID Handling', () => {
    test('GET /api/experiment-notes/:id with invalid hex ID returns 400', async () => {
      const res = await request(app)
        .get('/api/experiment-notes/invalid-not-24-hex-chars')
        .set('Authorization', 'Bearer valid-user1-token');

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation Error');
    });

    test('PATCH /api/experiment-notes/:id with invalid hex ID returns 400', async () => {
      const res = await request(app)
        .patch('/api/experiment-notes/12345')
        .set('Authorization', 'Bearer valid-user1-token')
        .send({ title: 'New' });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation Error');
    });

    test('DELETE /api/experiment-notes/:id with invalid hex ID returns 400', async () => {
      const res = await request(app)
        .delete('/api/experiment-notes/zzzzzzzzzzzzzzzzzzzzzzzz')
        .set('Authorization', 'Bearer valid-user1-token');

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation Error');
    });
  });

  // Scenario 11: Cross-user isolation - user cannot access, update, or delete another user's note
  describe('11. Cross-User Data Isolation', () => {
    let user2Note;

    beforeEach(async () => {
      user2Note = await service.createNote(user2.id, {
        title: 'Private Note from User 2',
        content: 'Confidential research hypotheses',
      });
    });

    test('user1 cannot view user2 note (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/experiment-notes/${user2Note.id}`)
        .set('Authorization', 'Bearer valid-user1-token');

      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Not Found');
    });

    test('user1 cannot update user2 note (returns 404)', async () => {
      const res = await request(app)
        .patch(`/api/experiment-notes/${user2Note.id}`)
        .set('Authorization', 'Bearer valid-user1-token')
        .send({ title: 'Hacked by user 1' });

      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Not Found');

      // Verify user2 note is unchanged
      const checkRes = await request(app)
        .get(`/api/experiment-notes/${user2Note.id}`)
        .set('Authorization', 'Bearer valid-user2-token');
      assert.equal(checkRes.body.title, 'Private Note from User 2');
    });

    test('user1 cannot delete user2 note (returns 404)', async () => {
      const res = await request(app)
        .delete(`/api/experiment-notes/${user2Note.id}`)
        .set('Authorization', 'Bearer valid-user1-token');

      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Not Found');

      // Verify note still exists for user2
      const checkRes = await request(app)
        .get(`/api/experiment-notes/${user2Note.id}`)
        .set('Authorization', 'Bearer valid-user2-token');
      assert.equal(checkRes.status, 200);
    });

    test('user1 list notes does not contain user2 notes', async () => {
      await service.createNote(user1.id, {
        title: 'User 1 public note',
        content: 'Safe content',
      });

      const res = await request(app)
        .get('/api/experiment-notes')
        .set('Authorization', 'Bearer valid-user1-token');

      assert.equal(res.status, 200);
      assert.equal(res.body.notes.length, 1);
      assert.equal(res.body.notes[0].title, 'User 1 public note');
    });
  });

  // Scenario 12: Database outage handling returns sanitized error
  describe('12. Database Outage / Error Handling', () => {
    test('returns 503 Service Unavailable when database connection error occurs', async () => {
      const failingService = {
        async createNote() {
          const err = new Error('buffering timed out after 5000ms');
          err.name = 'MongooseServerSelectionError';
          throw err;
        },
        async listNotes() {},
        async getNoteById() {},
        async updateNote() {},
        async deleteNote() {},
      };

      const failingApp = createApp({
        noteService: failingService,
        authVerifier: mockAuthVerifier,
        enableRateLimit: false,
      });

      const res = await request(failingApp)
        .post('/api/experiment-notes')
        .set('Authorization', 'Bearer valid-user1-token')
        .send({ title: 'Test', content: 'Test' });

      assert.equal(res.status, 503);
      assert.equal(res.body.error, 'Service Unavailable');
      assert.ok(!res.body.stack);
      assert.ok(!JSON.stringify(res.body).includes('mongodb://'));
    });

    test('returns 500 Internal Server Error without leaking internal stack traces for unexpected errors', async () => {
      const crashingService = {
        async createNote() {
          throw new Error('Secret internal failure with sensitive details');
        },
        async listNotes() {},
        async getNoteById() {},
        async updateNote() {},
        async deleteNote() {},
      };

      const crashingApp = createApp({
        noteService: crashingService,
        authVerifier: mockAuthVerifier,
        enableRateLimit: false,
      });

      const res = await request(crashingApp)
        .post('/api/experiment-notes')
        .set('Authorization', 'Bearer valid-user1-token')
        .send({ title: 'Test', content: 'Test' });

      assert.equal(res.status, 500);
      assert.equal(res.body.error, 'Internal Server Error');
      assert.equal(res.body.message, 'An unexpected internal error occurred.');
      assert.ok(!JSON.stringify(res.body).includes('Secret internal failure'));
    });
  });
});
