let counter = 1;

export const generateObjectId = () => {
  const hex = (counter++).toString(16).padStart(24, '0');
  return hex;
};

export const createInMemoryNotesService = (initialNotes = []) => {
  let notes = [...initialNotes];

  return {
    _getRawNotes: () => notes,
    _setNotes: (newNotes) => {
      notes = [...newNotes];
    },

    async createNote(ownerId, data) {
      const now = new Date().toISOString();
      const id = generateObjectId();
      const newNote = {
        id,
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
      const {
        page = 1,
        limit = 10,
        datasetName,
        modelName,
        experimentReference,
        tag,
        search,
      } = query;

      let filtered = notes.filter((n) => n.ownerId === ownerId);

      if (datasetName) {
        filtered = filtered.filter((n) => n.datasetName === datasetName);
      }
      if (modelName) {
        filtered = filtered.filter((n) => n.modelName === modelName);
      }
      if (experimentReference) {
        filtered = filtered.filter((n) => n.experimentReference === experimentReference);
      }
      if (tag) {
        filtered = filtered.filter((n) => n.tags && n.tags.includes(tag));
      }
      if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter(
          (n) =>
            n.title.toLowerCase().includes(lowerSearch) ||
            n.content.toLowerCase().includes(lowerSearch)
        );
      }

      // Sort by updatedAt descending
      filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      const total = filtered.length;
      const skip = (page - 1) * limit;
      const paginatedNotes = filtered.slice(skip, skip + limit);

      return {
        notes: paginatedNotes.map((n) => ({ ...n })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    },

    async getNoteById(ownerId, noteId) {
      const note = notes.find((n) => n.id === noteId && n.ownerId === ownerId);
      return note ? { ...note } : null;
    },

    async updateNote(ownerId, noteId, updateData) {
      const noteIndex = notes.findIndex(
        (n) => n.id === noteId && n.ownerId === ownerId
      );
      if (noteIndex === -1) {
        return null;
      }

      const existing = notes[noteIndex];
      const { ownerId: _o, _id: _i, id: _id, createdAt: _c, updatedAt: _u, ...cleanData } =
        updateData;

      const updated = {
        ...existing,
        ...cleanData,
        updatedAt: new Date().toISOString(),
      };
      notes[noteIndex] = updated;
      return { ...updated };
    },

    async deleteNote(ownerId, noteId) {
      const initialLength = notes.length;
      notes = notes.filter((n) => !(n.id === noteId && n.ownerId === ownerId));
      return notes.length < initialLength;
    },
  };
};
