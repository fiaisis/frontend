import axios from 'axios';

const isDev = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';

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

// We need to configure axios via interceptors because if the access token changes without a refresh the previous
// token will still be used
fiaApi.interceptors.request.use(async (config) => {
  config.baseURL = import.meta.env.VITE_FIA_REST_API_URL;
  config.headers['Authorization'] = `Bearer ${!isDev ? localStorage.getItem('scigateway:token') : ''}`;
  return config;
});

// This should be called when SciGateway successfully refreshes the access token - it retries
// all requests that failed due to an invalid token
const refreshTokenInterceptor = async (error: any): Promise<unknown> => {
  const originalRequest = error.config;
  // Check if the response is a 403 error
  if (error.response?.status === 403) {
    // Prevent multiple refresh requests
    if (!isFetchingAccessToken) {
      isFetchingAccessToken = true;

      // Request SciGateway to refresh the token
      document.dispatchEvent(
        new CustomEvent('scigateway', {
          detail: {
            type: 'scigateway:api:invalidate_token',
          },
        })
      );
    }

    // Add request to queue to be resolved only once SciGateway has successfully
    // refreshed the token
    return new Promise((resolve, reject) => {
      failedAuthRequestQueue.push((shouldReject?: boolean) => {
        if (shouldReject) reject(error);
        else resolve(fiaApi(originalRequest));
      });
    });
  } else return Promise.reject(error);
};

fiaApi.interceptors.response.use((response) => response, refreshTokenInterceptor);

export const h5Api = axios.create({
  timeout: 30000, // 30 second timeout for potentially large data transfers
});

h5Api.interceptors.request.use(async (config) => {
  config.baseURL = import.meta.env.VITE_FIA_PLOTTING_API_URL;
  config.headers['Authorization'] = `Bearer ${!isDev ? localStorage.getItem('scigateway:token') : ''}`;
  return config;
});

// Response interceptor for error handling and token refresh
h5Api.interceptors.response.use((response) => response, refreshTokenInterceptor);