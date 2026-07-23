import { afterEach, describe, expect, test, vi } from 'vitest';

import { clearFailedAuthRequestsQueue, fiaApi, h5Api, retryFailedAuthRequests } from './api';

import type { AxiosAdapter, AxiosError, InternalAxiosRequestConfig } from 'axios';

type RequestFulfilled = (
  config: InternalAxiosRequestConfig
) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;

type ResponseRejected = (error: AxiosError) => Promise<unknown>;

type RequestInterceptorHandler = {
  fulfilled?: RequestFulfilled;
};

type ResponseInterceptorHandler = {
  rejected?: ResponseRejected;
};

type InterceptorStore<THandler> = {
  handlers: Array<THandler | null>;
};

const originalFiaAdapter = fiaApi.defaults.adapter;

function getRequestFulfilled(api: typeof fiaApi): RequestFulfilled {
  const store = api.interceptors.request as unknown as InterceptorStore<RequestInterceptorHandler>;
  const fulfilled = store.handlers.find((handler) => handler?.fulfilled)?.fulfilled;

  if (!fulfilled) {
    throw new Error('Expected request interceptor to be registered');
  }

  return fulfilled;
}

function getResponseRejected(api: typeof fiaApi): ResponseRejected {
  const store = api.interceptors.response as unknown as InterceptorStore<ResponseInterceptorHandler>;
  const rejected = store.handlers.find((handler) => handler?.rejected)?.rejected;

  if (!rejected) {
    throw new Error('Expected response interceptor to be registered');
  }

  return rejected;
}

function createForbiddenError(url: string): AxiosError {
  return {
    config: {
      headers: {},
      url,
    } as InternalAxiosRequestConfig,
    response: {
      status: 403,
    },
  } as AxiosError;
}

function createAdapter(): AxiosAdapter {
  return vi.fn(async (config) => ({
    config,
    data: { retried: true },
    headers: {},
    status: 200,
    statusText: 'OK',
  }));
}

describe('api interceptors', () => {
  afterEach(() => {
    clearFailedAuthRequestsQueue();
    fiaApi.defaults.adapter = originalFiaAdapter;
    vi.restoreAllMocks();
  });

  test('sets the FIA API base URL and authorization header for requests', async () => {
    const config = await getRequestFulfilled(fiaApi)({ headers: {} } as InternalAxiosRequestConfig);
    const headers = config.headers as unknown as Record<string, string>;

    expect(config.baseURL).toBe('/api');
    expect(headers.Authorization).toBe('Bearer ');
  });

  test('sets the plotting API base URL and trims trailing slashes from request URLs', async () => {
    const config = await getRequestFulfilled(h5Api)({
      headers: {},
      url: '/datasets/?filename=LOQ.nxs',
    } as InternalAxiosRequestConfig);
    const headers = config.headers as unknown as Record<string, string>;

    expect(config.baseURL).toBe('/plottingapi');
    expect(config.url).toBe('/datasets?filename=LOQ.nxs');
    expect(headers.Authorization).toBe('Bearer ');
  });

  test('dispatches one token invalidation event and retries queued auth failures after refresh', async () => {
    const adapter = createAdapter();
    const listener = vi.fn();

    fiaApi.defaults.adapter = adapter;
    document.addEventListener('scigateway', listener as EventListener);

    const rejected = getResponseRejected(fiaApi);
    const firstRetry = rejected(createForbiddenError('/jobs/1'));
    const secondRetry = rejected(createForbiddenError('/jobs/2'));

    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({
      type: 'scigateway:api:invalidate_token',
    });

    retryFailedAuthRequests();

    await expect(firstRetry).resolves.toMatchObject({ data: { retried: true } });
    await expect(secondRetry).resolves.toMatchObject({ data: { retried: true } });
    expect(adapter).toHaveBeenCalledTimes(2);

    document.removeEventListener('scigateway', listener as EventListener);
  });

  test('rejects queued auth failures when SciGateway signs out', async () => {
    const adapter = createAdapter();
    const rejected = getResponseRejected(fiaApi);
    const error = createForbiddenError('/jobs/1');

    fiaApi.defaults.adapter = adapter;

    const retry = rejected(error);

    clearFailedAuthRequestsQueue();

    await expect(retry).rejects.toBe(error);
    expect(adapter).not.toHaveBeenCalled();
  });

  test('rejects non-auth response errors immediately', async () => {
    const rejected = getResponseRejected(fiaApi);
    const error = {
      config: { headers: {}, url: '/jobs/1' } as InternalAxiosRequestConfig,
      response: { status: 500 },
    } as AxiosError;

    await expect(rejected(error)).rejects.toBe(error);
  });
});
