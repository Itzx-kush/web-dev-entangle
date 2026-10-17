import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  experimentNotesApi,
  isNodeApiError,
  NodeApiConfigError,
  NodeApiError,
  NodeApiTransportError,
  resolveNodeApiBase,
} from '../lib/experimentNotesApi';
import type { CreateExperimentNoteInput, UpdateExperimentNoteInput } from '../types/experimentNotes';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Experiment Notes API client configuration and URL resolution', () => {
  it('preserves default http://localhost:5000/api in development mode when unconfigured', () => {
    expect(resolveNodeApiBase(undefined, false)).toBe('http://localhost:5000/api');
    expect(resolveNodeApiBase('', false)).toBe('http://localhost:5000/api');
    expect(resolveNodeApiBase('  ', false)).toBe('http://localhost:5000/api');
  });

  it('normalizes custom development URL by stripping trailing slashes', () => {
    expect(resolveNodeApiBase('http://localhost:5000/api/', false)).toBe(
      'http://localhost:5000/api'
    );
  });

  it('fails in production mode when VITE_NODE_API_BASE is missing or empty', () => {
    expect(() => resolveNodeApiBase(undefined, true)).toThrow(NodeApiConfigError);
    expect(() => resolveNodeApiBase('', true)).toThrow(/not configured for production/i);
  });

  it('fails in production mode when targeting localhost or insecure HTTP', () => {
    expect(() => resolveNodeApiBase('http://localhost:4000/api', true)).toThrow(
      /must not target localhost/i
    );
    expect(() => resolveNodeApiBase('http://127.0.0.1:4000/api', true)).toThrow(
      /must not target localhost/i
    );
    expect(() => resolveNodeApiBase('http://api.entanglex.org/api', true)).toThrow(
      /must use HTTPS/i
    );
  });

  it('accepts HTTPS URLs and same-origin relative paths in production', () => {
    expect(resolveNodeApiBase('https://api.entanglex.org/api/', true)).toBe(
      'https://api.entanglex.org/api'
    );
    expect(resolveNodeApiBase('/api/node/', true)).toBe('/api/node');
  });
});

describe('Experiment Notes API client request operations', () => {
  const token = 'test-session-jwt-token';
  const sampleNote = {
    id: '507f1f77bcf86cd799439011',
    title: 'VQC Parameter Exploration',
    content: 'Observed 91% accuracy with 4 layers on diabetes dataset.',
    datasetName: 'Diabetes UCI',
    modelName: 'VQC',
    experimentReference: 'exp-vqc-01',
    tags: ['quantum', 'vqc'],
    ownerId: 'usr-123',
    createdAt: '2026-10-17T10:00:00Z',
    updatedAt: '2026-10-17T10:00:00Z',
  };

  it('attaches the Supabase access token in Authorization: Bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ notes: [sampleNote], pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await experimentNotesApi.listNotes(token);
    const [, options] = fetchMock.mock.calls[0];
    expect((options.headers as Headers).get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('rejects calls without an access token before making a network request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(experimentNotesApi.listNotes('')).rejects.toThrow(NodeApiError);
    await expect(experimentNotesApi.createNote('', { title: 'T', content: 'C' })).rejects.toThrow(
      NodeApiError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('constructs query parameters properly for listNotes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ notes: [], pagination: { total: 0, page: 2, limit: 20, totalPages: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await experimentNotesApi.listNotes(token, {
      page: 2,
      limit: 20,
      search: 'quantum',
      datasetName: 'Diabetes',
      modelName: 'VQC',
      experimentReference: 'exp-1',
      tag: 'vqc',
    });

    const [url] = fetchMock.mock.calls[0];
    const urlStr = String(url);
    expect(urlStr).toContain('page=2');
    expect(urlStr).toContain('limit=20');
    expect(urlStr).toContain('search=quantum');
    expect(urlStr).toContain('datasetName=Diabetes');
    expect(urlStr).toContain('modelName=VQC');
    expect(urlStr).toContain('experimentReference=exp-1');
    expect(urlStr).toContain('tag=vqc');
  });

  it('sends POST /experiment-notes with correct JSON payload on createNote', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleNote), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const input: CreateExperimentNoteInput = {
      title: 'VQC Parameter Exploration',
      content: 'Observed 91% accuracy with 4 layers on diabetes dataset.',
      datasetName: 'Diabetes UCI',
      modelName: 'VQC',
      experimentReference: 'exp-vqc-01',
      tags: ['quantum', 'vqc'],
    };

    const created = await experimentNotesApi.createNote(token, input);
    expect(created.id).toBe(sampleNote.id);

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/experiment-notes');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(input);
    expect((options.headers as Headers).get('Content-Type')).toBe('application/json');
  });

  it('sends PATCH /experiment-notes/:id with partial JSON payload on updateNote', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...sampleNote, title: 'Updated Title' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const updateInput: UpdateExperimentNoteInput = {
      title: 'Updated Title',
    };

    const updated = await experimentNotesApi.updateNote(token, sampleNote.id, updateInput);
    expect(updated.title).toBe('Updated Title');

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/experiment-notes/${sampleNote.id}`);
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body)).toEqual(updateInput);
  });

  it('sends DELETE /experiment-notes/:id on deleteNote', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Experiment note deleted successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await experimentNotesApi.deleteNote(token, sampleNote.id);
    expect(res.message).toContain('deleted');

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/experiment-notes/${sampleNote.id}`);
    expect(options.method).toBe('DELETE');
  });

  it('retrieves single note via GET /experiment-notes/:id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleNote), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const note = await experimentNotesApi.getNote(token, sampleNote.id);
    expect(note.id).toBe(sampleNote.id);
  });

  it('translates 400 validation error responses with details', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'Validation Error',
          message: 'Request payload failed validation',
          details: [{ path: 'title', message: 'Title is required' }],
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      await experimentNotesApi.createNote(token, { title: '', content: 'valid' });
      expect.fail('should have thrown');
    } catch (err) {
      expect(isNodeApiError(err)).toBe(true);
      if (isNodeApiError(err)) {
        expect(err.status).toBe(400);
      }
    }
  });

  it('translates network transport failures into NodeApiTransportError', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(experimentNotesApi.listNotes(token)).rejects.toThrow(NodeApiTransportError);
  });
});
