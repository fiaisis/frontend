import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { fiaApi } from './api';
import { parseJobOutputs } from './hooks';

export interface FastStartJob {
  id: string;
  userNumber: string;
  startTime: string | null;
  endTime: string | null;
  status: string;
  script: string;
  outputPaths: string[];
}

const FAST_START_JOB_PATHS = buildPathCandidates(
  import.meta.env.VITE_FIA_FAST_START_JOBS_PATH,
  '/jobs/fast-start',
  '/jobs/fast_start'
);

const FAST_START_JOB_COUNT_PATHS = buildPathCandidates(
  import.meta.env.VITE_FIA_FAST_START_JOBS_COUNT_PATH,
  '/jobs/fast-start/count',
  '/jobs/fast_start/count'
);

function buildPathCandidates(...paths: Array<string | undefined>): string[] {
  return Array.from(
    new Set(paths.filter((path): path is string => Boolean(path && path.trim())).map((path) => path.trim()))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function coerceString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => coerceString(entry)).filter((entry): entry is string => entry !== null);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const parsedOutputs = parseJobOutputs(trimmed)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (parsedOutputs.length > 1 || (parsedOutputs.length === 1 && parsedOutputs[0] !== trimmed)) {
    return parsedOutputs;
  }

  if (trimmed.includes('\n')) {
    return trimmed
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [trimmed];
}

function getErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const response = error.response;
  if (!isRecord(response)) {
    return undefined;
  }

  return typeof response.status === 'number' ? response.status : undefined;
}

function isEndpointMissing(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 404 || status === 405;
}

function extractRows(payload: unknown, depth = 0): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload) || depth > 2) {
    return [];
  }

  for (const key of ['jobs', 'items', 'results', 'rows', 'data']) {
    const rows = extractRows(payload[key], depth + 1);
    if (rows.length > 0) {
      return rows;
    }
  }

  return [];
}

function extractTotal(payload: unknown, depth = 0): number | null {
  if (typeof payload === 'number' && Number.isFinite(payload)) {
    return payload;
  }

  if (typeof payload === 'string') {
    const parsed = Number(payload);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (!isRecord(payload) || depth > 2) {
    return null;
  }

  for (const key of ['count', 'total', 'total_rows', 'totalRows']) {
    const value = payload[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  for (const key of ['pagination', 'meta', 'data']) {
    const nestedTotal = extractTotal(payload[key], depth + 1);
    if (nestedTotal !== null) {
      return nestedTotal;
    }
  }

  return null;
}

function normaliseFastStartJob(item: unknown, index: number, currentUserNumber?: string | null): FastStartJob {
  const record = isRecord(item) ? item : {};
  const nestedJob = isRecord(record.job) ? record.job : null;
  const nestedScript = isRecord(record.script) ? record.script : null;
  const nestedUser = isRecord(record.user) ? record.user : null;

  const userNumber =
    coerceString(
      record.user_number ??
        record.userNumber ??
        record.user_id ??
        record.userId ??
        nestedUser?.number ??
        nestedUser?.user_number ??
        nestedUser?.userNumber ??
        nestedUser?.id
    ) ??
    currentUserNumber ??
    'N/A';

  const startTime =
    coerceString(record.start_time ?? record.startTime ?? record.start ?? record.job_start ?? nestedJob?.start) ?? null;

  const endTime =
    coerceString(record.end_time ?? record.endTime ?? record.end ?? record.job_end ?? nestedJob?.end) ?? null;

  const status =
    coerceString(record.status ?? record.state ?? record.job_status ?? record.jobStatus ?? nestedJob?.state) ??
    'UNKNOWN';

  const script =
    coerceString(
      record.script_text ??
        record.scriptText ??
        nestedScript?.value ??
        record.script ??
        record.command ??
        record.python_script ??
        record.pythonScript
    ) ?? '';

  const outputPaths = coerceStringArray(
    record.output_paths ??
      record.outputPaths ??
      record.output_path ??
      record.outputPath ??
      record.outputs ??
      nestedJob?.outputs
  );

  const id =
    coerceString(record.id ?? record.job_id ?? record.jobId ?? nestedJob?.id) ??
    `${userNumber}-${startTime ?? 'unknown'}-${index}`;

  return {
    id,
    userNumber,
    startTime,
    endTime,
    status,
    script,
    outputPaths,
  };
}

async function requestFirstAvailable<T>(paths: string[], config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  let lastError: unknown;

  for (const path of paths) {
    try {
      return await fiaApi.get<T>(path, config);
    } catch (error) {
      if (isEndpointMissing(error)) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error('No fast start jobs API path configured');
}

export const fetchFastStartJobs = async (
  params: Record<string, string | number | boolean>,
  currentUserNumber?: string | null
): Promise<FastStartJob[]> => {
  const response = await requestFirstAvailable<unknown>(FAST_START_JOB_PATHS, { params });
  return extractRows(response.data).map((item, index) => normaliseFastStartJob(item, index, currentUserNumber));
};

export const fetchFastStartJobCount = async (
  params: Record<string, string | number | boolean>
): Promise<number | null> => {
  const response = await requestFirstAvailable<unknown>(FAST_START_JOB_COUNT_PATHS, { params });
  return extractTotal(response.data);
};

export const isFastStartJobsApiUnavailable = (error: unknown): boolean => isEndpointMissing(error);
