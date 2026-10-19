let counter = 1;

export const generateObjectId = () => {
  const suffix = (counter++).toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${suffix}`;
};

export const createInMemoryNotesService = (initialNotes = []) => {
  let notes = [...initialNotes];

  return {
    _getRawNotes: () => notes,
    _setNotes: (newNotes) => { notes = [...newNotes]; },

    async createNote(ownerId, data) {
      const now = new Date().toISOString();
      const newNote = {
        id: generateObjectId(),
        title: data.title,
        content: data.content,
        datasetName: data.datasetName || '',
        modelName: data.modelName || '',
        experimentReference: data.experimentReference || '',
        tags: data.tags || [],
        ownerId,
        createdAt: now,
        updatedAt: now,
      };
      notes.push(newNote);
      return { ...newNote };
    },

    async listNotes(ownerId, query = {}) {
      const { page = 1, limit = 10, datasetName, modelName, experimentReference, tag, search } = query;
      let filtered = notes.filter((note) => note.ownerId === ownerId);
      if (datasetName) filtered = filtered.filter((note) => note.datasetName === datasetName);
      if (modelName) filtered = filtered.filter((note) => note.modelName === modelName);
      if (experimentReference) filtered = filtered.filter((note) => note.experimentReference === experimentReference);
      if (tag) filtered = filtered.filter((note) => note.tags && note.tags.includes(tag));
      if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter((note) =>
          note.title.toLowerCase().includes(lowerSearch) ||
          note.content.toLowerCase().includes(lowerSearch)
        );
      }
      filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      const total = filtered.length;
      const skip = (page - 1) * limit;
      return {
        notes: filtered.slice(skip, skip + limit).map((note) => ({ ...note })),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
      };
    },

    async getNoteById(ownerId, noteId) {
      const note = notes.find((item) => item.id === noteId && item.ownerId === ownerId);
      return note ? { ...note } : null;
    },

    async updateNote(ownerId, noteId, updateData) {
      const index = notes.findIndex((item) => item.id === noteId && item.ownerId === ownerId);
      if (index === -1) return null;
      const existing = notes[index];
      const { ownerId: _ownerId, _id: _mongoId, id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...cleanData } = updateData;
      const updated = { ...existing, ...cleanData, updatedAt: new Date().toISOString() };
      notes[index] = updated;
      return { ...updated };
    },

    async deleteNote(ownerId, noteId) {
      const length = notes.length;
      notes = notes.filter((note) => !(note.id === noteId && note.ownerId === ownerId));
      return notes.length < length;
    },
  };
};
