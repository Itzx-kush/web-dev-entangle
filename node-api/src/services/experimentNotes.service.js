const FIELD_TO_COLUMN = {
  title: 'title',
  content: 'content',
  datasetName: 'dataset_name',
  modelName: 'model_name',
  experimentReference: 'experiment_reference',
  tags: 'tags',
};

const toPublicNote = (row) => ({
  id: row.id,
  title: row.title,
  content: row.content,
  datasetName: row.dataset_name || '',
  modelName: row.model_name || '',
  experimentReference: row.experiment_reference || '',
  tags: row.tags || [],
  ownerId: row.owner_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const unavailable = () => {
  const error = new Error('Database service is currently unreachable. Please try again later.');
  error.name = 'Service Unavailable';
  error.status = 503;
  return error;
};

const requireClient = (client) => {
  if (!client || typeof client.from !== 'function') throw unavailable();
};

const handleResult = ({ data, error }) => {
  if (error) throw unavailable();
  return data;
};

const payloadToRow = (data) => {
  const row = {};
  for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
    if (data[field] !== undefined) row[column] = data[field];
  }
  return row;
};

export const createExperimentNotesService = () => ({
  async createNote(ownerId, data, client) {
    requireClient(client);
    const row = {
      ...payloadToRow(data),
      owner_id: ownerId,
      dataset_name: data.datasetName || '',
      model_name: data.modelName || '',
      experiment_reference: data.experimentReference || '',
      tags: data.tags || [],
    };
    const result = await client.from('experiment_notes').insert(row).select('*').single();
    return toPublicNote(handleResult(result));
  },

  async listNotes(ownerId, query = {}, client) {
    requireClient(client);
    const {
      page = 1,
      limit = 10,
      datasetName,
      modelName,
      experimentReference,
      tag,
      search,
    } = query;

    let request = client
      .from('experiment_notes')
      .select('*', { count: 'exact' })
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false });

    if (datasetName) request = request.eq('dataset_name', datasetName);
    if (modelName) request = request.eq('model_name', modelName);
    if (experimentReference) request = request.eq('experiment_reference', experimentReference);
    if (tag) request = request.contains('tags', [tag]);

    const safeSearch = typeof search === 'string'
      ? search.replace(/[,%()\\"]/g, ' ').trim()
      : '';
    if (safeSearch) {
      request = request.or(`title.ilike.%${safeSearch}%,content.ilike.%${safeSearch}%`);
    }

    const result = await request.range((page - 1) * limit, (page * limit) - 1);
    const rows = handleResult(result) || [];
    const total = result.count || 0;
    return {
      notes: rows.map(toPublicNote),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async getNoteById(ownerId, noteId, client) {
    requireClient(client);
    const result = await client
      .from('experiment_notes')
      .select('*')
      .eq('id', noteId)
      .eq('owner_id', ownerId)
      .maybeSingle();
    const row = handleResult(result);
    return row ? toPublicNote(row) : null;
  },

  async updateNote(ownerId, noteId, updateData, client) {
    requireClient(client);
    const row = payloadToRow(updateData);
    const result = await client
      .from('experiment_notes')
      .update(row)
      .eq('id', noteId)
      .eq('owner_id', ownerId)
      .select('*')
      .maybeSingle();
    const updated = handleResult(result);
    return updated ? toPublicNote(updated) : null;
  },

  async deleteNote(ownerId, noteId, client) {
    requireClient(client);
    const result = await client
      .from('experiment_notes')
      .delete()
      .eq('id', noteId)
      .eq('owner_id', ownerId)
      .select('id')
      .maybeSingle();
    return Boolean(handleResult(result));
  },
});

export const defaultExperimentNotesService = createExperimentNotesService();
