export interface ExperimentNote {
  id: string;
  title: string;
  content: string;
  datasetName: string;
  modelName: string;
  experimentReference: string;
  tags: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExperimentNoteInput {
  title: string;
  content: string;
  datasetName?: string;
  modelName?: string;
  experimentReference?: string;
  tags?: string[];
}

export interface UpdateExperimentNoteInput {
  title?: string;
  content?: string;
  datasetName?: string;
  modelName?: string;
  experimentReference?: string;
  tags?: string[];
}

export interface ExperimentNotesPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExperimentNotesListResponse {
  notes: ExperimentNote[];
  data?: ExperimentNote[];
  pagination: ExperimentNotesPagination;
}

export interface ExperimentNotesQueryParams {
  page?: number;
  limit?: number;
  datasetName?: string;
  modelName?: string;
  experimentReference?: string;
  tag?: string;
  search?: string;
}
