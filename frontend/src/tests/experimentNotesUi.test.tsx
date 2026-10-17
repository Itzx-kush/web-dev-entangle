import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExperimentNotesPage } from '../research/ExperimentNotesPage';
import { useAuth } from '../auth/AuthProvider';
import { experimentNotesApi } from '../lib/experimentNotesApi';
import type { ExperimentNote } from '../types/experimentNotes';

vi.mock('../auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../lib/experimentNotesApi', async () => {
  const actual = await vi.importActual<typeof import('../lib/experimentNotesApi')>(
    '../lib/experimentNotesApi'
  );
  return {
    ...actual,
    experimentNotesApi: {
      health: vi.fn(),
      listNotes: vi.fn(),
      getNote: vi.fn(),
      createNote: vi.fn(),
      updateNote: vi.fn(),
      deleteNote: vi.fn(),
    },
  };
});

const sampleNote: ExperimentNote = {
  id: '507f1f77bcf86cd799439011',
  title: 'Quantum VQC Convergence Notes',
  content: 'Ansatz depth 4 converged in 45 iterations with 0.89 AUC.',
  datasetName: 'Heart Disease UCI',
  modelName: 'VQC',
  experimentReference: 'exp-qhc-001',
  tags: ['vqc', 'quantum', 'heart'],
  ownerId: 'usr-123',
  createdAt: '2026-10-17T10:00:00Z',
  updatedAt: '2026-10-17T10:05:00Z',
};

function renderPage(ui: React.ReactNode = <ExperimentNotesPage />) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    session: { access_token: 'valid-jwt-token' },
    user: { id: 'usr-123', email: 'researcher@entanglex.org' },
    isAuthenticated: true,
    isConfigured: true,
    leaveGuestMode: vi.fn(),
  } as any);
});

describe('Experiment Notes UI — Authentication & Configuration States', () => {
  it('renders guest mode notice when user is not signed in', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      user: null,
      isAuthenticated: false,
      isConfigured: true,
      leaveGuestMode: vi.fn(),
    } as any);

    renderPage();
    expect(screen.getByText('Guest mode is active')).toBeInTheDocument();
    expect(screen.getByText(/Private research notes are available only after signing in/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in with Google or GitHub/i })).toBeInTheDocument();
    expect(experimentNotesApi.listNotes).not.toHaveBeenCalled();
  });

  it('renders configuration guidance when Supabase is not configured', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      user: null,
      isAuthenticated: true,
      isConfigured: false,
      leaveGuestMode: vi.fn(),
    } as any);

    renderPage();
    expect(
      screen.getByText(/Account sign-in is not configured for this deployment/i)
    ).toBeInTheDocument();
  });
});

describe('Experiment Notes UI — List, Empty, and Error States', () => {
  it('renders empty state when user has no saved notes', async () => {
    vi.mocked(experimentNotesApi.listNotes).mockResolvedValue({
      notes: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    });

    renderPage();
    expect(await screen.findByText('No experiment notes yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create your first note/i })).toBeInTheDocument();
  });

  it('renders existing note cards with metadata pills and tags', async () => {
    vi.mocked(experimentNotesApi.listNotes).mockResolvedValue({
      notes: [sampleNote],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    renderPage();
    expect(await screen.findByText(sampleNote.title)).toBeInTheDocument();
    expect(screen.getByText(sampleNote.content)).toBeInTheDocument();
    expect(screen.getByText(sampleNote.datasetName)).toBeInTheDocument();
    expect(screen.getByText(sampleNote.modelName)).toBeInTheDocument();
    expect(screen.getByText(sampleNote.experimentReference)).toBeInTheDocument();
    sampleNote.tags.forEach((tag) => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
  });

  it('renders error state when note fetching fails and allows retry', async () => {
    vi.mocked(experimentNotesApi.listNotes).mockRejectedValue(
      new Error('Notes database service unavailable')
    );

    renderPage();
    expect(await screen.findByText('Experiment notes unavailable')).toBeInTheDocument();
    expect(screen.getByText('Notes database service unavailable')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(experimentNotesApi.listNotes).toHaveBeenCalledTimes(2);
  });
});

describe('Experiment Notes UI — Note Creation & Validation', () => {
  it('shows validation errors when submitting empty required fields', async () => {
    vi.mocked(experimentNotesApi.listNotes).mockResolvedValue({
      notes: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    });

    renderPage();
    await screen.findByText('No experiment notes yet');

    // Click New Note
    fireEvent.click(screen.getByRole('button', { name: /New Note/i }));
    expect(screen.getByText('Create Experiment Note')).toBeInTheDocument();

    // Submit empty form
    fireEvent.click(screen.getByRole('button', { name: /Save Note/i }));

    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Content is required.')).toBeInTheDocument();
    expect(experimentNotesApi.createNote).not.toHaveBeenCalled();
  });

  it('successfully creates note, resets form, and displays success notification', async () => {
    vi.mocked(experimentNotesApi.listNotes)
      .mockResolvedValueOnce({
        notes: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
      })
      .mockResolvedValue({
        notes: [sampleNote],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

    vi.mocked(experimentNotesApi.createNote).mockResolvedValue(sampleNote);

    renderPage();
    await screen.findByText('No experiment notes yet');

    fireEvent.click(screen.getByRole('button', { name: /New Note/i }));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e.g. VQC Ansatz Depth/i), {
      target: { value: sampleNote.title },
    });
    fireEvent.change(screen.getByPlaceholderText(/Write your research observations/i), {
      target: { value: sampleNote.content },
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g. Heart Disease UCI/i), {
      target: { value: sampleNote.datasetName },
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g. VQC \/ Random Forest/i), {
      target: { value: sampleNote.modelName },
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g. exp-heart-vqc-01/i), {
      target: { value: sampleNote.experimentReference },
    });
    fireEvent.change(screen.getByPlaceholderText(/quantum, vqc, baseline/i), {
      target: { value: sampleNote.tags.join(', ') },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Save Note/i }));

    await waitFor(() => {
      expect(experimentNotesApi.createNote).toHaveBeenCalledWith('valid-jwt-token', {
        title: sampleNote.title,
        content: sampleNote.content,
        datasetName: sampleNote.datasetName,
        modelName: sampleNote.modelName,
        experimentReference: sampleNote.experimentReference,
        tags: sampleNote.tags,
      });
    });

    expect(
      await screen.findByText(`Note "${sampleNote.title}" created successfully.`)
    ).toBeInTheDocument();
  });

  it('preserves form contents and displays error banner when creation fails', async () => {
    vi.mocked(experimentNotesApi.listNotes).mockResolvedValue({
      notes: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    });

    vi.mocked(experimentNotesApi.createNote).mockRejectedValue(
      new Error('Database validation failed: unique title constraint')
    );

    renderPage();
    await screen.findByText('No experiment notes yet');

    fireEvent.click(screen.getByRole('button', { name: /New Note/i }));

    const titleInput = screen.getByPlaceholderText(/e.g. VQC Ansatz Depth/i);
    const contentInput = screen.getByPlaceholderText(/Write your research observations/i);

    fireEvent.change(titleInput, { target: { value: 'My Failed Note' } });
    fireEvent.change(contentInput, { target: { value: 'Important observations' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Note/i }));

    expect(
      await screen.findByText('Database validation failed: unique title constraint')
    ).toBeInTheDocument();

    // Verify form input is preserved
    expect((titleInput as HTMLInputElement).value).toBe('My Failed Note');
    expect((contentInput as HTMLTextAreaElement).value).toBe('Important observations');
  });
});

describe('Experiment Notes UI — Edit & Delete Operations', () => {
  it('populates editor when Edit is clicked and updates note on save', async () => {
    vi.mocked(experimentNotesApi.listNotes).mockResolvedValue({
      notes: [sampleNote],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    const updatedNote = { ...sampleNote, title: 'Revised Quantum Title' };
    vi.mocked(experimentNotesApi.updateNote).mockResolvedValue(updatedNote);

    renderPage();
    expect(await screen.findByText(sampleNote.title)).toBeInTheDocument();

    // Click Edit
    const editBtn = screen.getByTitle('Edit note');
    fireEvent.click(editBtn);

    expect(screen.getByText('Edit Experiment Note')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/e.g. VQC Ansatz Depth/i);
    expect((titleInput as HTMLInputElement).value).toBe(sampleNote.title);

    fireEvent.change(titleInput, { target: { value: 'Revised Quantum Title' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Note/i }));

    await waitFor(() => {
      expect(experimentNotesApi.updateNote).toHaveBeenCalledWith(
        'valid-jwt-token',
        sampleNote.id,
        expect.objectContaining({ title: 'Revised Quantum Title' })
      );
    });

    expect(
      await screen.findByText(`Note "Revised Quantum Title" updated successfully.`)
    ).toBeInTheDocument();
  });

  it('confirms and deletes a note when Delete button is clicked', async () => {
    vi.mocked(experimentNotesApi.listNotes).mockResolvedValue({
      notes: [sampleNote],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    vi.mocked(experimentNotesApi.deleteNote).mockResolvedValue({
      message: 'Experiment note deleted successfully',
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPage();
    expect(await screen.findByText(sampleNote.title)).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Delete note');
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(experimentNotesApi.deleteNote).toHaveBeenCalledWith('valid-jwt-token', sampleNote.id);
    });

    expect(await screen.findByText('Experiment note deleted successfully.')).toBeInTheDocument();
  });

  it('cancels deletion when confirm dialog is rejected', async () => {
    vi.mocked(experimentNotesApi.listNotes).mockResolvedValue({
      notes: [sampleNote],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderPage();
    expect(await screen.findByText(sampleNote.title)).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Delete note');
    fireEvent.click(deleteBtn);

    expect(experimentNotesApi.deleteNote).not.toHaveBeenCalled();
  });
});
