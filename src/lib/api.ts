import axios from 'axios';

const isDev = import.meta.env.REACT_APP_DEV_MODE === 'true';

export const fiaApi = axios.create();

let isFetchingAccessToken = false;
let failedAuthRequestQueue: ((shouldReject?: boolean) => void)[] = [];

//  This should be called when SciGateway successfully refreshes the access token - it retries
//  all requests that failed due to an invalid token
export const retryFailedAuthRequests = (): void => {
  isFetchingAccessToken = false;
  failedAuthRequestQueue.forEach((callback) => callback());
  failedAuthRequestQueue = [];
};

// This should be called when SciGateway logs out as would occur if a token refresh fails
// due to the refresh token being out of date - it rejects all active request promises that
// were awaiting a token refresh using the original error that occurred on the first attempt
export const clearFailedAuthRequestsQueue = (): void => {
  isFetchingAccessToken = false;
  failedAuthRequestQueue.forEach((callback) => callback(true));
  failedAuthRequestQueue = [];
};

// Configure axios via interceptors (token may change)
fiaApi.interceptors.request.use(async (config) => {
  // NOTE: in vite.config.ts ensure envPrefix includes 'REACT_APP_'
  // envPrefix: ['VITE_', 'REACT_APP_']
  config.baseURL = import.meta.env.REACT_APP_FIA_REST_API_URL;

  // avoid "Bearer null"
  const token = !isDev ? (localStorage.getItem('scigateway:token') ?? '') : '';
  config.headers = { ...(config.headers ?? {}), Authorization: `Bearer ${token}` };
  return config;
});

fiaApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 403) {
      if (!isFetchingAccessToken) {
        isFetchingAccessToken = true;
        document.dispatchEvent(
          new CustomEvent('scigateway', {
            detail: { type: 'scigateway:api:invalidate_token' },
          })
        );
      }

      return new Promise((resolve, reject) => {
        failedAuthRequestQueue.push((shouldReject?: boolean) => {
          if (shouldReject) reject(error);
          else resolve(fiaApi(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);
