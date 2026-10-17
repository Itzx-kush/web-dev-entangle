import type {
  CreateExperimentNoteInput,
  ExperimentNote,
  ExperimentNotesListResponse,
  ExperimentNotesQueryParams,
  UpdateExperimentNoteInput,
} from '../types/experimentNotes';

export class NodeApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    { status, code = 'http_error', details }: { status: number; code?: string; details?: unknown }
  ) {
    super(message);
    this.name = 'NodeApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NodeApiTransportError extends Error {
  constructor(
    message = 'Unable to reach the Experiment Notes service. Check your connection and try again.',
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'NodeApiTransportError';
  }
}

export class NodeApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NodeApiConfigError';
  }
}

export function isNodeApiError(error: unknown): error is NodeApiError {
  return error instanceof NodeApiError;
}

export function resolveNodeApiBase(
  configured: string | undefined,
  production: boolean = import.meta.env.PROD
): string {
  const trimmed = configured?.trim();

  if (production) {
    if (!trimmed) {
      throw new NodeApiConfigError(
        'Node API base URL is not configured for production. Please set VITE_NODE_API_BASE.'
      );
    }

    try {
      const url = new URL(trimmed);
      if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
        throw new NodeApiConfigError('Production Node API base must not target localhost.');
      }
      if (url.protocol !== 'https:') {
        throw new NodeApiConfigError('Production cross-origin Node API base must use HTTPS.');
      }
    } catch (error) {
      if (error instanceof NodeApiConfigError) throw error;
      if (trimmed.startsWith('/')) {
        return trimmed.length > 1 ? trimmed.replace(/\/+$/, '') : trimmed;
      }
      throw new NodeApiConfigError(
        'Production Node API base must be a relative path or an absolute HTTPS URL.'
      );
    }
  }

  const fallback = trimmed || 'http://localhost:4000/api';
  return fallback.length > 1 ? fallback.replace(/\/+$/, '') : fallback;
}

function getNodeApiBase(): string {
  return resolveNodeApiBase(
    import.meta.env.VITE_NODE_API_BASE as string | undefined,
    import.meta.env.PROD
  );
}

interface NodeApiErrorBody {
  error?: string;
  message?: string;
  details?: Array<{ path?: string; message?: string }> | unknown;
}

async function nodeApiFetch(
  path: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<Response> {
  const base = getNodeApiBase();
  const headers = new Headers(options.headers);

  if (accessToken?.trim()) {
    headers.set('Authorization', `Bearer ${accessToken.trim()}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers,
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch (err) {
    throw new NodeApiTransportError(
      `Unable to reach the Experiment Notes service while requesting ${path}. Please check your connection and ensure the service is running.`,
      { cause: err }
    );
  }

  if (!response.ok) {
    let body: NodeApiErrorBody = {};
    try {
      body = (await response.json()) as NodeApiErrorBody;
    } catch {
      // Non-JSON response
    }

    let defaultMsg = `Request failed with status ${response.status}`;
    if (response.status === 400) {
      if (Array.isArray(body.details) && body.details.length > 0) {
        defaultMsg = body.details.map((d) => d.message || d.path).join('; ');
      } else {
        defaultMsg = body.message || 'Invalid request payload';
      }
    } else if (response.status === 401) {
      defaultMsg = body.message || 'Authentication session is invalid or expired. Please sign in again.';
    } else if (response.status === 404) {
      defaultMsg = body.message || 'The requested experiment note was not found.';
    } else if (response.status === 429) {
      defaultMsg = body.message || 'Rate limit exceeded. Please wait a moment before trying again.';
    } else if (response.status === 503) {
      defaultMsg = body.message || 'The experiment notes database or service is currently unavailable. Please try again later.';
    } else if (response.status >= 500) {
      defaultMsg = body.message || 'An internal server error occurred in the experiment notes service.';
    }

    const message = body.message || defaultMsg;
    throw new NodeApiError(message, {
      status: response.status,
      code: body.error,
      details: body.details,
    });
  }

  return response;
}

export const experimentNotesApi = {
  async health(): Promise<{ status: string; database: string; uptime: number; timestamp: string }> {
    const res = await nodeApiFetch('/health');
    return res.json();
  },

  async listNotes(
    accessToken: string,
    params: ExperimentNotesQueryParams = {}
  ): Promise<ExperimentNotesListResponse> {
    if (!accessToken?.trim()) {
      throw new NodeApiError('Authentication is required to view experiment notes.', {
        status: 401,
        code: 'unauthorized',
      });
    }

    const searchParams = new URLSearchParams();
    if (params.page && params.page > 1) searchParams.set('page', String(params.page));
    if (params.limit && params.limit !== 10) searchParams.set('limit', String(params.limit));
    if (params.datasetName?.trim()) searchParams.set('datasetName', params.datasetName.trim());
    if (params.modelName?.trim()) searchParams.set('modelName', params.modelName.trim());
    if (params.experimentReference?.trim()) {
      searchParams.set('experimentReference', params.experimentReference.trim());
    }
    if (params.tag?.trim()) searchParams.set('tag', params.tag.trim());
    if (params.search?.trim()) searchParams.set('search', params.search.trim());

    const qs = searchParams.toString();
    const endpoint = `/experiment-notes${qs ? `?${qs}` : ''}`;
    const res = await nodeApiFetch(endpoint, { method: 'GET' }, accessToken);
    const data = await res.json();

    return {
      notes: data.notes || data.data || [],
      pagination: data.pagination || {
        total: (data.notes || data.data || []).length,
        page: params.page || 1,
        limit: params.limit || 10,
        totalPages: 1,
      },
    };
  },

  async getNote(accessToken: string, id: string): Promise<ExperimentNote> {
    if (!accessToken?.trim()) {
      throw new NodeApiError('Authentication is required to view an experiment note.', {
        status: 401,
        code: 'unauthorized',
      });
    }

    const res = await nodeApiFetch(`/experiment-notes/${encodeURIComponent(id)}`, { method: 'GET' }, accessToken);
    return res.json();
  },

  async createNote(accessToken: string, input: CreateExperimentNoteInput): Promise<ExperimentNote> {
    if (!accessToken?.trim()) {
      throw new NodeApiError('Authentication is required to create an experiment note.', {
        status: 401,
        code: 'unauthorized',
      });
    }

    const res = await nodeApiFetch(
      '/experiment-notes',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken
    );
    return res.json();
  },

  async updateNote(
    accessToken: string,
    id: string,
    input: UpdateExperimentNoteInput
  ): Promise<ExperimentNote> {
    if (!accessToken?.trim()) {
      throw new NodeApiError('Authentication is required to update an experiment note.', {
        status: 401,
        code: 'unauthorized',
      });
    }

    const res = await nodeApiFetch(
      `/experiment-notes/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      accessToken
    );
    return res.json();
  },

  async deleteNote(accessToken: string, id: string): Promise<{ message: string }> {
    if (!accessToken?.trim()) {
      throw new NodeApiError('Authentication is required to delete an experiment note.', {
        status: 401,
        code: 'unauthorized',
      });
    }

    const res = await nodeApiFetch(
      `/experiment-notes/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
      accessToken
    );
    return res.json();
  },
};
