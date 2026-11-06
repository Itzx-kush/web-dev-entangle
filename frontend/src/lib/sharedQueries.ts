import { qh as api } from './api';
import type { Job } from '../types/qhealth';

export const SHARED_QUERY_KEYS = {
  health: ['health'] as const,
  systemStatus: ['system-status'] as const,
  summary: ['summary'] as const,
  datasets: ['datasets'] as const,
  datasetLibrary: ['dataset-library'] as const,
  experiments: ['experiments'] as const,
  jobs: ['jobs'] as const,
  alignment: ['alignment'] as const,
} as const;

export const SHARED_POLL_INTERVALS = {
  health: 15_000,
  systemStatus: 15_000,
  summary: 10_000,
  datasets: 15_000,
  datasetLibrary: 30_000,
  experiments: 12_000,
  jobsIdle: 15_000,
  jobsActive: 3_000,
} as const;

export const SHARED_STALE_TIMES = {
  health: 12_000,
  systemStatus: 12_000,
  summary: 8_000,
  datasets: 12_000,
  datasetLibrary: 30_000,
  experiments: 8_000,
  jobs: 5_000,
  alignment: 30_000,
} as const;

/**
 * Returns a polling interval function that preserves real-time updates when healthy
 * while halting repetitive background polling loops when a request is in an error state.
 */
export function adaptivePollInterval(intervalMs: number) {
  return (query: { state: { status: string } }): number | false => {
    if (query.state.status === 'error') {
      return false;
    }
    return intervalMs;
  };
}

export function sharedHealthQueryOptions() {
  return {
    queryKey: SHARED_QUERY_KEYS.health,
    queryFn: api.health,
    staleTime: SHARED_STALE_TIMES.health,
    refetchInterval: adaptivePollInterval(SHARED_POLL_INTERVALS.health),
    refetchOnWindowFocus: false,
    retry: false,
  };
}

export function sharedSystemStatusQueryOptions() {
  return {
    queryKey: SHARED_QUERY_KEYS.systemStatus,
    queryFn: api.systemStatus,
    staleTime: SHARED_STALE_TIMES.systemStatus,
    refetchInterval: adaptivePollInterval(SHARED_POLL_INTERVALS.systemStatus),
    refetchOnWindowFocus: false,
    retry: false,
  };
}

export function sharedSummaryQueryOptions() {
  return {
    queryKey: SHARED_QUERY_KEYS.summary,
    queryFn: api.summary,
    staleTime: SHARED_STALE_TIMES.summary,
    refetchInterval: adaptivePollInterval(SHARED_POLL_INTERVALS.summary),
    refetchOnWindowFocus: false,
    retry: false,
  };
}

export function sharedDatasetsQueryOptions(options?: { poll?: boolean }) {
  return {
    queryKey: SHARED_QUERY_KEYS.datasets,
    queryFn: api.datasets,
    staleTime: SHARED_STALE_TIMES.datasets,
    refetchInterval: options?.poll ? adaptivePollInterval(SHARED_POLL_INTERVALS.datasets) : false as const,
    refetchOnWindowFocus: false,
    retry: false,
  };
}

export function sharedDatasetLibraryQueryOptions(options?: { poll?: boolean; enabled?: boolean }) {
  return {
    queryKey: SHARED_QUERY_KEYS.datasetLibrary,
    queryFn: api.datasetLibrary,
    staleTime: SHARED_STALE_TIMES.datasetLibrary,
    refetchInterval: options?.poll ? adaptivePollInterval(SHARED_POLL_INTERVALS.datasetLibrary) : false as const,
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false,
    retry: false,
  };
}

export function sharedExperimentsQueryOptions(options?: { poll?: boolean; intervalMs?: number }) {
  const interval = options?.intervalMs ?? SHARED_POLL_INTERVALS.experiments;
  return {
    queryKey: SHARED_QUERY_KEYS.experiments,
    queryFn: api.experiments,
    staleTime: SHARED_STALE_TIMES.experiments,
    refetchInterval: options?.poll ? adaptivePollInterval(interval) : false as const,
    refetchOnWindowFocus: false,
    retry: false,
  };
}

export function sharedJobsQueryOptions() {
  return {
    queryKey: SHARED_QUERY_KEYS.jobs,
    queryFn: api.jobs,
    staleTime: SHARED_STALE_TIMES.jobs,
    refetchInterval: (query: { state: { status: string; data?: Job[] } }): number | false => {
      if (query.state.status === 'error') {
        return false;
      }
      const hasActiveJob = query.state.data?.some(
        job => job.status === 'queued' || job.status === 'running',
      );
      return hasActiveJob ? SHARED_POLL_INTERVALS.jobsActive : SHARED_POLL_INTERVALS.jobsIdle;
    },
    refetchOnWindowFocus: false,
    retry: false,
  };
}

export function sharedAlignmentQueryOptions(enabled = true) {
  return {
    queryKey: SHARED_QUERY_KEYS.alignment,
    queryFn: api.alignment,
    staleTime: SHARED_STALE_TIMES.alignment,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  };
}
