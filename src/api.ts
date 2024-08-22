import axios from 'axios';

export const fiaApi = axios.create({
  baseURL: process.env.REACT_APP_FIA_REST_API_URL,
  headers: { Authorization: `Bearer ${localStorage.getItem('scigateway:token')}` },
});

let isFetchingAccessToken = false;
let failedAuthRequestQueue: ((shouldReject?: boolean) => void)[] = [];

/* This should be called when SciGateway successfully refreshes the access token - it retries
   all requests that failed due to an invalid token */
export const retryFailedAuthRequests = (): void => {
  isFetchingAccessToken = false;
  failedAuthRequestQueue.forEach((callback) => callback());
  failedAuthRequestQueue = [];
};

/* This should be called when SciGateway logs out as would occur if a token refresh fails
   due to the refresh token being out of date - it rejects all active request promises that
   were awaiting a token refresh using the original error that occurred on the first attempt */
export const clearFailedAuthRequestsQueue = (): void => {
  isFetchingAccessToken = false;
  failedAuthRequestQueue.forEach((callback) => callback(true));
  failedAuthRequestQueue = [];
};

fiaApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('hello');
    console.log(error.config);
  }
);
