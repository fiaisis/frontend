import { afterEach, describe, expect, test, vi } from 'vitest';

import { fiaApi } from './api';
import {
  analyseScript,
  byteLength,
  contentHash,
  isWithinSizeCap,
  MAX_SCRIPT_BYTES,
  parseAnalysisResponse,
} from './scriptDiagnostics';

vi.mock('./api', () => ({ fiaApi: { post: vi.fn() } }));

/** A response exactly as `script_lsp/models.py` produces it, field for field. */
const RESPONSE = {
  content_hash: 'abc123',
  parses: false,
  diagnostics: [
    {
      message: "undefined name 'BinMQ'",
      severity: 'warning',
      source: 'pyflakes',
      start_line: 4,
      start_column: 9,
      end_line: 4,
      end_column: 14,
    },
  ],
  truncated: false,
};

const axiosError = (status: number, data: unknown, headers: Record<string, string> = {}): unknown => ({
  response: { status, data, headers },
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('the size cap', () => {
  test('counts bytes rather than characters', () => {
    // One character, four bytes: `string.length` would let a script of these through at a fifth of its
    // real size, which is exactly how the two services would come to disagree.
    expect(byteLength('\u{1F600}')).toBe(4);
    expect(isWithinSizeCap('x'.repeat(MAX_SCRIPT_BYTES))).toBe(true);
    expect(isWithinSizeCap('x'.repeat(MAX_SCRIPT_BYTES + 1))).toBe(false);
  });
});

describe('contentHash', () => {
  test('is stable for the same script and different between two scripts', async () => {
    expect(await contentHash('print(1)')).toBe(await contentHash('print(1)'));
    expect(await contentHash('print(1)')).not.toBe(await contentHash('print(2)'));
  });

  test('still works where crypto.subtle is unavailable', async () => {
    // The plugin runs inside a host we do not control, and `subtle` is missing outside secure contexts.
    vi.stubGlobal('crypto', { getRandomValues: () => new Uint8Array(8) });

    const hash = await contentHash('print(1)');

    expect(hash).toMatch(/^[0-9a-f]{14}$/);
    expect(hash).not.toBe(await contentHash('print(2)'));
  });
});

describe('parseAnalysisResponse', () => {
  test('accepts what the analysis service sends', () => {
    expect(parseAnalysisResponse(RESPONSE)).toEqual({
      content_hash: 'abc123',
      parses: false,
      diagnostics: RESPONSE.diagnostics,
      truncated: false,
    });
  });

  test('rejects a FastAPI error body with the same confidence as a broken response', () => {
    // FIA-API forwards the service's JSON without modelling it, and a route that is not deployed yet
    // answers with this. Reading `.diagnostics.length` off it would be the bug.
    expect(parseAnalysisResponse({ detail: 'Not Found' })).toBeNull();
  });

  test('rejects the shapes that would corrupt the editor rather than merely annoy it', () => {
    const missing = { ...RESPONSE };
    delete (missing as Record<string, unknown>)['content_hash'];

    expect(parseAnalysisResponse(null)).toBeNull();
    expect(parseAnalysisResponse([])).toBeNull();
    expect(parseAnalysisResponse({ ...RESPONSE, parses: 'no' })).toBeNull();
    expect(parseAnalysisResponse({ ...RESPONSE, diagnostics: 'oops' })).toBeNull();
    expect(parseAnalysisResponse(missing)).toBeNull();
    expect(
      parseAnalysisResponse({ ...RESPONSE, diagnostics: [{ ...RESPONSE.diagnostics[0], start_line: 0 }] })
    ).toBeNull();
    expect(
      parseAnalysisResponse({ ...RESPONSE, diagnostics: [{ ...RESPONSE.diagnostics[0], source: 'ruff' }] })
    ).toBeNull();
    expect(
      parseAnalysisResponse({ ...RESPONSE, diagnostics: [{ ...RESPONSE.diagnostics[0], message: '' }] })
    ).toBeNull();
    expect(parseAnalysisResponse({ ...RESPONSE, diagnostics: [null] })).toBeNull();
  });

  test('treats a missing truncated flag as not truncated', () => {
    const withoutFlag = { ...RESPONSE };
    delete (withoutFlag as Record<string, unknown>)['truncated'];

    expect(parseAnalysisResponse(withoutFlag)?.truncated).toBe(false);
  });
});

describe('analyseScript', () => {
  test('posts the script and the hash it wants echoed back', async () => {
    vi.mocked(fiaApi.post).mockResolvedValue({ data: RESPONSE });

    const outcome = await analyseScript('x = 1\n');

    expect(fiaApi.post).toHaveBeenCalledWith(
      '/script/analyse',
      { content: 'x = 1\n', content_hash: await contentHash('x = 1\n') },
      { signal: undefined }
    );
    expect(outcome).toEqual({ ok: true, response: parseAnalysisResponse(RESPONSE) });
  });

  test('a warming service is a distinct answer, not just an error', async () => {
    vi.mocked(fiaApi.post).mockRejectedValue(
      axiosError(503, { detail: { reason: 'warming_up', detail: 'Loading the Mantid framework' } })
    );

    await expect(analyseScript('x = 1\n')).resolves.toEqual({
      ok: false,
      failure: 'warming_up',
      retryAfterSeconds: null,
    });
  });

  test('carries Retry-After through from a 429', async () => {
    vi.mocked(fiaApi.post).mockRejectedValue(
      axiosError(429, { detail: { reason: 'rate_limited' } }, { 'retry-after': '12' })
    );

    await expect(analyseScript('x = 1\n')).resolves.toEqual({
      ok: false,
      failure: 'rate_limited',
      retryAfterSeconds: 12,
    });
  });

  test('maps the refusals FIA-API makes on the analysis service’s behalf', async () => {
    const cases: [unknown, string][] = [
      [axiosError(413, { detail: { reason: 'too_large' } }), 'too_large'],
      [axiosError(504, { detail: { reason: 'timed_out' } }), 'timeout'],
      [axiosError(502, { detail: { reason: 'bad_upstream_response' } }), 'unavailable'],
      [axiosError(503, { detail: { reason: 'upstream_unavailable' } }), 'unavailable'],
      [axiosError(401, { detail: 'Not authenticated' }), 'forbidden'],
      [axiosError(403, { detail: 'Forbidden' }), 'forbidden'],
      [{ request: {}, message: 'Network Error' }, 'unavailable'],
    ];

    for (const [error, failure] of cases) {
      vi.mocked(fiaApi.post).mockRejectedValue(error);
      await expect(analyseScript('x = 1\n')).resolves.toMatchObject({ ok: false, failure });
    }
  });

  test('still classifies a refusal whose body has no reason in it', async () => {
    // A proxy or a framework-level handler can answer 413/429 with a body of its own; the status is all
    // there is, and it still means different things.
    for (const [status, failure] of [
      [413, 'too_large'],
      [429, 'rate_limited'],
    ] as const) {
      vi.mocked(fiaApi.post).mockRejectedValue(axiosError(status, 'Too Big'));
      await expect(analyseScript('x = 1\n')).resolves.toMatchObject({ ok: false, failure });
    }
  });

  test('a 200 that is not a response is a failure, not an empty script', async () => {
    vi.mocked(fiaApi.post).mockResolvedValue({ data: { detail: 'Not Found' } });

    await expect(analyseScript('x = 1\n')).resolves.toEqual({
      ok: false,
      failure: 'malformed',
      retryAfterSeconds: null,
    });
  });

  test('passes an abort through, because the caller stopped caring rather than anything breaking', async () => {
    const abort = new Error('canceled');
    vi.mocked(fiaApi.post).mockRejectedValue(abort);
    const controller = new AbortController();
    controller.abort();

    await expect(analyseScript('x = 1\n', controller.signal)).rejects.toBe(abort);
  });
});
