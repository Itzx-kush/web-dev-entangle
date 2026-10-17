import { useState, useEffect, useId } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  LogIn,
  RefreshCw,
  X,
  Check,
  Tag,
  FlaskConical,
  Database,
  Sliders,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  experimentNotesApi,
  isNodeApiError,
  NodeApiConfigError,
} from '../lib/experimentNotesApi';
import type {
  CreateExperimentNoteInput,
  ExperimentNote,
  UpdateExperimentNoteInput,
} from '../types/experimentNotes';
import { Button, Card, Input, Textarea, Badge } from '../components/ui';
import {
  EmptyState,
  ErrorBanner,
  Loading,
  Notice,
  PageHeader,
} from '../components/Shared';
import { dateTime } from '../utils/format';

interface FormState {
  title: string;
  content: string;
  datasetName: string;
  modelName: string;
  experimentReference: string;
  tagsString: string;
}

const INITIAL_FORM: FormState = {
  title: '',
  content: '',
  datasetName: '',
  modelName: '',
  experimentReference: '',
  tagsString: '',
};

interface FormErrors {
  title?: string;
  content?: string;
  general?: string;
}

export function ExperimentNotesPage() {
  const { session, user, isAuthenticated, isConfigured, leaveGuestMode } = useAuth();
  const token = session?.access_token || '';
  const queryClient = useQueryClient();

  // Search and Pagination state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1); // Reset to first page on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Form & Edit state
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<ExperimentNote | null>(null);
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Accessible element IDs
  const titleInputId = useId();
  const contentInputId = useId();
  const datasetInputId = useId();
  const modelInputId = useId();
  const refInputId = useId();
  const tagsInputId = useId();

  // Reset success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Query: Fetch notes with React Query
  const notesQuery = useQuery({
    queryKey: ['experiment-notes', user?.id, debouncedSearch, page],
    queryFn: () =>
      experimentNotesApi.listNotes(token, {
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
      }),
    enabled: Boolean(isAuthenticated && token),
    retry: false,
  });

  // Mutation: Create Note
  const createMutation = useMutation({
    mutationFn: (payload: CreateExperimentNoteInput) =>
      experimentNotesApi.createNote(token, payload),
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['experiment-notes', user?.id] });
      setFormData(INITIAL_FORM);
      setFormErrors({});
      setIsCreating(false);
      setSuccessMessage(`Note "${newNote.title}" created successfully.`);
    },
    onError: (err: unknown) => {
      setFormErrors((prev) => ({
        ...prev,
        general: err instanceof Error ? err.message : 'Failed to create note.',
      }));
    },
  });

  // Mutation: Update Note
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateExperimentNoteInput }) =>
      experimentNotesApi.updateNote(token, id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['experiment-notes', user?.id] });
      setEditingNote(null);
      setFormData(INITIAL_FORM);
      setFormErrors({});
      setSuccessMessage(`Note "${updated.title}" updated successfully.`);
    },
    onError: (err: unknown) => {
      setFormErrors((prev) => ({
        ...prev,
        general: err instanceof Error ? err.message : 'Failed to update note.',
      }));
    },
  });

  // Mutation: Delete Note
  const deleteMutation = useMutation({
    mutationFn: (id: string) => experimentNotesApi.deleteNote(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiment-notes', user?.id] });
      setSuccessMessage('Experiment note deleted successfully.');
    },
  });

  // Client-side Validation
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.title.trim()) {
      errors.title = 'Title is required.';
    } else if (formData.title.trim().length > 200) {
      errors.title = 'Title cannot exceed 200 characters.';
    }

    if (!formData.content.trim()) {
      errors.content = 'Content is required.';
    } else if (formData.content.trim().length > 10000) {
      errors.content = 'Content cannot exceed 10,000 characters.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStartCreate = () => {
    setEditingNote(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsCreating(true);
  };

  const handleStartEdit = (note: ExperimentNote) => {
    setIsCreating(false);
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      datasetName: note.datasetName || '',
      modelName: note.modelName || '',
      experimentReference: note.experimentReference || '',
      tagsString: note.tags?.join(', ') || '',
    });
    setFormErrors({});
    // Scroll editor into view
    try {
      window.scrollTo({ top: 180, behavior: 'smooth' });
    } catch {
      // In testing or environments without window.scrollTo
    }
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingNote(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const parsedTags = formData.tagsString
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingNote) {
      const payload: UpdateExperimentNoteInput = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        datasetName: formData.datasetName.trim(),
        modelName: formData.modelName.trim(),
        experimentReference: formData.experimentReference.trim(),
        tags: parsedTags,
      };
      updateMutation.mutate({ id: editingNote.id, payload });
    } else {
      const payload: CreateExperimentNoteInput = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        datasetName: formData.datasetName.trim(),
        modelName: formData.modelName.trim(),
        experimentReference: formData.experimentReference.trim(),
        tags: parsedTags,
      };
      createMutation.mutate(payload);
    }
  };

  const handleDeleteNote = (note: ExperimentNote) => {
    if (
      window.confirm(
        `Delete experiment note "${note.title}"?\n\nThis removes the note permanently from your research workspace.`
      )
    ) {
      deleteMutation.mutate(note.id);
    }
  };

  // Unauthenticated / Guest View
  if (!isAuthenticated) {
    return (
      <div className="layer3-final-workspace layer3-reports-page">
        <PageHeader
          eyebrow="Personal research"
          title="Experiment Notes"
          description="Private research notes are available only after signing in."
        />
        <Card
          title="Guest mode is active"
          description="Sign in to your account to record, search, and manage persistent observations alongside your quantum and classical ML experiments."
        >
          <Button onClick={leaveGuestMode}>
            <LogIn size={14} />
            Sign in with Google or GitHub
          </Button>
        </Card>
      </div>
    );
  }

  // Supabase not configured guidance
  if (!isConfigured) {
    return (
      <div className="layer3-final-workspace layer3-reports-page">
        <PageHeader
          eyebrow="Personal research"
          title="Experiment Notes"
          description="Private cloud research notes require authentication service configuration."
        />
        <Notice tone="amber">
          Account sign-in is not configured for this deployment. Please configure public Supabase
          credentials in your environment to access personal experiment notes.
        </Notice>
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const generalMutationError =
    formErrors.general ||
    (createMutation.error as Error)?.message ||
    (updateMutation.error as Error)?.message ||
    (deleteMutation.error as Error)?.message;

  const notesList = notesQuery.data?.notes || [];
  const pagination = notesQuery.data?.pagination;

  return (
    <div className="layer3-final-workspace layer3-reports-page space-y-6">
      <PageHeader
        eyebrow="Personal research"
        title="Experiment Notes"
        description="Capture observations, methods, and follow-up ideas alongside your research experiments."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link className="btn btn-outline" to="/my-research">
              Research activity
            </Link>
            {!isCreating && !editingNote && (
              <Button onClick={handleStartCreate}>
                <Plus size={14} />
                New Note
              </Button>
            )}
          </div>
        }
      />

      {successMessage && <Notice tone="green">{successMessage}</Notice>}
      {generalMutationError && <ErrorBanner error={generalMutationError} />}

      {/* Note Creation / Editing Card Form */}
      {(isCreating || editingNote) && (
        <Card
          title={editingNote ? 'Edit Experiment Note' : 'Create Experiment Note'}
          description={
            editingNote
              ? 'Modify your qualitative observations, tags, or experiment references.'
              : 'Record notes, hypotheses, and parameter observations for this research session.'
          }
          className="border-primary/30 shadow-md"
        >
          <form onSubmit={handleSubmitForm} className="space-y-4" noValidate>
            <div className="field">
              <label htmlFor={titleInputId} className="flex justify-between">
                <span>
                  Title <strong className="text-red-500">*</strong>
                </span>
                <small className="muted">{formData.title.length}/200</small>
              </label>
              <Input
                id={titleInputId}
                type="text"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (formErrors.title) setFormErrors({ ...formErrors, title: undefined });
                }}
                placeholder="e.g. VQC Ansatz Depth and Convergence on Heart Disease Dataset"
                maxLength={200}
                required
                aria-required="true"
                aria-invalid={Boolean(formErrors.title)}
                disabled={isSaving}
              />
              {formErrors.title && (
                <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {formErrors.title}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor={contentInputId} className="flex justify-between">
                <span>
                  Observations & Content <strong className="text-red-500">*</strong>
                </span>
                <small className="muted">{formData.content.length}/10,000</small>
              </label>
              <Textarea
                id={contentInputId}
                value={formData.content}
                onChange={(e) => {
                  setFormData({ ...formData, content: e.target.value });
                  if (formErrors.content) setFormErrors({ ...formErrors, content: undefined });
                }}
                placeholder="Write your research observations, circuit variations, baseline comparison notes, or conclusions..."
                rows={5}
                maxLength={10000}
                required
                aria-required="true"
                aria-invalid={Boolean(formErrors.content)}
                disabled={isSaving}
              />
              {formErrors.content && (
                <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {formErrors.content}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="field">
                <label htmlFor={datasetInputId}>
                  <span>Dataset Name (Optional)</span>
                </label>
                <Input
                  id={datasetInputId}
                  type="text"
                  value={formData.datasetName}
                  onChange={(e) => setFormData({ ...formData, datasetName: e.target.value })}
                  placeholder="e.g. Heart Disease UCI"
                  disabled={isSaving}
                />
              </div>

              <div className="field">
                <label htmlFor={modelInputId}>
                  <span>Model Name (Optional)</span>
                </label>
                <Input
                  id={modelInputId}
                  type="text"
                  value={formData.modelName}
                  onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                  placeholder="e.g. VQC / Random Forest"
                  disabled={isSaving}
                />
              </div>

              <div className="field">
                <label htmlFor={refInputId}>
                  <span>Experiment Ref (Optional)</span>
                </label>
                <Input
                  id={refInputId}
                  type="text"
                  value={formData.experimentReference}
                  onChange={(e) =>
                    setFormData({ ...formData, experimentReference: e.target.value })
                  }
                  placeholder="e.g. exp-heart-vqc-01"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor={tagsInputId}>
                <span>Tags (Optional, comma-separated)</span>
              </label>
              <Input
                id={tagsInputId}
                type="text"
                value={formData.tagsString}
                onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })}
                placeholder="quantum, vqc, baseline, heart-disease"
                disabled={isSaving}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button type="submit" disabled={isSaving}>
                <Check size={14} />
                {isSaving
                  ? editingNote
                    ? 'Updating Note…'
                    : 'Saving Note…'
                  : editingNote
                  ? 'Update Note'
                  : 'Save Note'}
              </Button>
              <Button variant="outline" type="button" onClick={handleCancelForm} disabled={isSaving}>
                <X size={14} />
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search Bar & List Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            className="input pl-9 pr-8"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search notes by keyword in title or content…"
            aria-label="Search experiment notes"
          />
          {searchInput && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {pagination && pagination.total > 0 && (
          <span className="text-xs muted" aria-live="polite">
            Showing {notesList.length} of {pagination.total}{' '}
            {pagination.total === 1 ? 'note' : 'notes'}
          </span>
        )}
      </div>

      {/* Content Area: Loading, Error, Empty, or Note Cards */}
      {notesQuery.isLoading ? (
        <Loading />
      ) : notesQuery.isError ? (
        <Card
          title="Experiment notes unavailable"
          description="Unable to load research notes from the notes service."
        >
          <ErrorBanner error={(notesQuery.error as Error)?.message} />
          <div className="mt-4">
            <Button variant="outline" onClick={() => notesQuery.refetch()}>
              <RefreshCw size={14} />
              Retry
            </Button>
          </div>
        </Card>
      ) : notesList.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? 'No matching notes found' : 'No experiment notes yet'}
          action={
            !isCreating && (
              <Button onClick={handleStartCreate}>
                <Plus size={14} />
                Create your first note
              </Button>
            )
          }
        >
          {debouncedSearch
            ? `No experiment notes matched the search term "${debouncedSearch}". Try a different search query.`
            : 'Capture qualitative hypotheses, hyperparameter observations, and classical versus quantum evaluation results alongside your experiments.'}
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {notesList.map((note) => (
            <Card key={note.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="section-title text-base font-semibold leading-snug">
                    {note.title}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      onClick={() => handleStartEdit(note)}
                      aria-label={`Edit note: ${note.title}`}
                      title="Edit note"
                      disabled={isSaving || deleteMutation.isPending}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => handleDeleteNote(note)}
                      aria-label={`Delete note: ${note.title}`}
                      title="Delete note"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                {/* Metadata Pills */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs muted">
                  {note.datasetName && (
                    <span className="inline-flex items-center gap-1">
                      <Database size={11} />
                      {note.datasetName}
                    </span>
                  )}
                  {note.modelName && (
                    <span className="inline-flex items-center gap-1">
                      <Sliders size={11} />
                      {note.modelName}
                    </span>
                  )}
                  {note.experimentReference && (
                    <span className="inline-flex items-center gap-1">
                      <FlaskConical size={11} />
                      <Link
                        to={`/experiments/${encodeURIComponent(note.experimentReference)}`}
                        className="underline hover:text-foreground"
                      >
                        {note.experimentReference}
                      </Link>
                    </span>
                  )}
                  <span className="ml-auto text-[11px]">
                    Updated {dateTime(note.updatedAt || note.createdAt)}
                  </span>
                </div>

                {/* Content Body */}
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {note.content}
                </p>
              </div>

              {/* Tags Footer */}
              {note.tags && note.tags.length > 0 && (
                <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-1.5">
                  <Tag size={12} className="muted mr-1" />
                  {note.tags.map((tag) => (
                    <Badge key={tag} tone="purple">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <nav
          className="flex items-center justify-between border-t pt-4"
          aria-label="Experiment notes pagination"
        >
          <Button
            variant="outline"
            disabled={page <= 1 || notesQuery.isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} />
            Previous
          </Button>

          <span className="text-xs muted">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <Button
            variant="outline"
            disabled={page >= pagination.totalPages || notesQuery.isFetching}
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
          >
            Next
            <ChevronRight size={14} />
          </Button>
        </nav>
      )}
    </div>
  );
}
