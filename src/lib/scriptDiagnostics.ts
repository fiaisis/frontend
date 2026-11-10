import { fiaApi } from './api';

/**
 * The script analysis wire contract, as the browser sees it.
 *
 * The canonical definition is `script_lsp/models.py` in `../mantid-python-script-lsp`; `fia-api`
 * validates the request and forwards the response body and status code untouched, so this file is the
 * other half of the mirror. Renaming a field there means renaming it here, and nothing else.
 *
 * Field names stay snake_case rather than being prettified, so that the object parsed off the socket is
 * the object held in state and passed to the marker bridge: a rename step would be one more place for a
 * mismatch to hide, and the response is unvalidated JSON by the time it reaches us (see
 * `parseAnalysisResponse`).
 */

export type DiagnosticSeverity = 'error' | 'warning';

/**
 * `compile` is CPython's own verdict, i.e. what the runner will do with the script, and the only source
 * that means "this will not run". `jedi` parses broken code to find more than the first mistake.
 * `pyflakes` is the undefined-name lint, run only when the script parses.
 */
export type DiagnosticSource = 'compile' | 'jedi' | 'pyflakes';

/** One problem with the script, already positioned the way Monaco counts. */
export interface Diagnostic {
  message: string;
  severity: DiagnosticSeverity;
  source: DiagnosticSource;
  /** 1-based. */
  start_line: number;
  /** 1-based, counted in UTF-16 code units, which is what Monaco wants and not what Python gives. */
  start_column: number;
  end_line: number;
  /** Exclusive, the way Monaco reads it. */
  end_column: number;
}

export interface AnalysisResponse {
  /** Echoed back from the request, and the only thing that makes a reply match the text on screen. */
  content_hash: string;
  /** Whether CPython would accept the script at all — what "Rerun with changes" will do with it. */
  parses: boolean;
  diagnostics: Diagnostic[];
  /** True when the service found more than it was willing to send. */
  truncated: boolean;
}

/**
 * Restated from `MAX_SCRIPT_BYTES` in both services, which must agree with each other. Over this the
 * editors do not send at all: a script this big is not something a squiggle can help with, and it should
 * not cost a parse to find that out.
 */
export const MAX_SCRIPT_BYTES = 200_000;

/** Why we could not say anything about the script, distinct because the editor reacts differently. */
export type DiagnosticsFailure =
  /** The analysis service is up but Mantid is still loading. Keep the old markers, say it quietly. */
  | 'warming_up'
  /** Too many requests. Back off rather than hammering. */
  | 'rate_limited'
  /** Script over `MAX_SCRIPT_BYTES`. Not a problem with the script, so do not warn on it. */
  | 'too_large'
  /** Rejected as unauthenticated, which for a logged-in user means the token went stale. */
  | 'forbidden'
  /** The request took longer than the server's own timeout. */
  | 'timeout'
  /** The service is down, unreachable, or answered something we could not use. */
  | 'unavailable'
  /** A 200 whose body was not an `AnalysisResponse` — see `parseAnalysisResponse`. */
  | 'malformed';

export type DiagnosticsOutcome =
  | { ok: true; response: AnalysisResponse }
  | { ok: false; failure: DiagnosticsFailure; retryAfterSeconds: number | null };

/** Byte length, because that is what both services measure the cap in — not `string.length`. */
export const byteLength = (text: string): number => new TextEncoder().encode(text).length;

export const isWithinSizeCap = (text: string): boolean => byteLength(text) <= MAX_SCRIPT_BYTES;

/**
 * A digest of the script, used to notice that a reply has arrived for text the user has since replaced.
 *
 * SHA-256 when the platform offers it, FNV-1a in 64 bits when it does not: `crypto.subtle` is missing on
 * non-secure origins, and the plugin is embedded in a host we do not control. This is not a security
 * boundary — neither service trusts this value with anything. The cache in `fia-api` is keyed on its own
 * SHA-256 of the content, computed server-side, and this digest is only echoed back so that the caller
 * can throw away an out-of-date reply, so a collision would at worst discard one response.
 */
export const contentHash = async (text: string): Promise<string> => {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return cyrb53(text);
};

/**
 * A 53-bit hash in ordinary arithmetic, which is what is left with `target: es5` ruling out BigInt.
 *
 * Only reached where `crypto.subtle` is missing. 53 bits is far more than comparing two scripts in one
 * session needs, and this value is trusted with nothing: the cache in `fia-api` is keyed on its own
 * SHA-256 of the content, computed server-side.
 */
const cyrb53 = (text: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c5cebe;
  for (let index = 0; index < text.length; index += 1) {
    const character = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ character, 2654435761);
    h2 = Math.imul(h2 ^ character, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPositioned = (value: unknown): value is Diagnostic => {
  if (!isRecord(value)) {
    return false;
  }
  const position = [value['start_line'], value['start_column'], value['end_line'], value['end_column']];
  return (
    typeof value['message'] === 'string' &&
    value['message'].length > 0 &&
    (value['severity'] === 'error' || value['severity'] === 'warning') &&
    (value['source'] === 'compile' || value['source'] === 'jedi' || value['source'] === 'pyflakes') &&
    position.every((entry) => typeof entry === 'number' && Number.isInteger(entry) && entry >= 1)
  );
};

/**
 * Recognise an `AnalysisResponse`, or return null.
 *
 * `fia-api` forwards the service's JSON without modelling it, so nothing between the two services and
 * this function has checked what arrives. A FastAPI 404 (`{"detail":"Not Found"}`), a gateway's HTML
 * error page, or a field renamed on one side all have to be answered here rather than at the point where
 * the editor reads `diagnostics.length` and finds `undefined`. Returning null means "treat this as the
 * service being unavailable", which keeps the markers the editor already has.
 */
export const parseAnalysisResponse = (value: unknown): AnalysisResponse | null => {
  if (!isRecord(value) || typeof value['parses'] !== 'boolean' || !Array.isArray(value['diagnostics'])) {
    return null;
  }
  if (typeof value['content_hash'] !== 'string' || !value['diagnostics'].every(isPositioned)) {
    return null;
  }
  return {
    content_hash: value['content_hash'],
    parses: value['parses'],
    diagnostics: value['diagnostics'] as Diagnostic[],
    truncated: value['truncated'] === true,
  };
};

const failureForStatus = (status: number | undefined, body: unknown): DiagnosticsFailure => {
  const reason = isRecord(body) && isRecord(body['detail']) ? body['detail']['reason'] : undefined;
  if (reason === 'warming_up') {
    return 'warming_up';
  }
  if (reason === 'rate_limited') {
    return 'rate_limited';
  }
  if (reason === 'too_large') {
    return 'too_large';
  }
  if (reason === 'timed_out') {
    return 'timeout';
  }
  if (status === 401 || status === 403) {
    return 'forbidden';
  }
  if (status === 413) {
    return 'too_large';
  }
  if (status === 429) {
    return 'rate_limited';
  }
  return 'unavailable';
};

const retryAfterSeconds = (headers: unknown): number | null => {
  const raw = isRecord(headers) ? headers['retry-after'] : undefined;
  const seconds = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
};

/**
 * Ask for a script to be analysed.
 *
 * Never throws for a reason the editor could act on: every rejection becomes an `ok: false` outcome so a
 * validation outage cannot surface as an unhandled error in the middle of typing. It does reject when the
 * caller aborts, because that is the caller deciding it no longer wants an answer.
 */
export const analyseScript = async (content: string, signal?: AbortSignal): Promise<DiagnosticsOutcome> => {
  const hash = await contentHash(content);

  let response;
  try {
    response = await fiaApi.post('/script/analyse', { content, content_hash: hash }, { signal });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    const status = (error as { response?: { status?: number; data?: unknown; headers?: unknown } }).response?.status;
    const body = (error as { response?: { data?: unknown } }).response?.data;
    const headers = (error as { response?: { headers?: unknown } }).response?.headers;
    return { ok: false, failure: failureForStatus(status, body), retryAfterSeconds: retryAfterSeconds(headers) };
  }

  const parsed = parseAnalysisResponse(response.data);
  if (parsed === null) {
    return { ok: false, failure: 'malformed', retryAfterSeconds: null };
  }
  return { ok: true, response: parsed };
};
