import axios from 'axios';
import { store } from '../app/store.js';
import { credentialsSet, loggedOut } from '../features/auth/authSlice.js';

// `withCredentials` lets the httpOnly refresh-token cookie flow to /auth/refresh;
// the access token itself travels as a Bearer header, kept in memory (Redux),
// never in localStorage.
export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

const REFRESH_PATH = '/auth/refresh';

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    // A 401 from the refresh endpoint itself just means there's no valid
    // session — it must never re-enter this handler, or the retry ends up
    // awaiting the very promise that's failing and deadlocks the app.
    if (config?.url === REFRESH_PATH) {
      store.dispatch(loggedOut());
      return Promise.reject(error);
    }

    if (response?.status !== 401 || config._retried) {
      return Promise.reject(error);
    }
    config._retried = true;

    try {
      refreshPromise ??= apiClient.post(REFRESH_PATH).finally(() => {
        refreshPromise = null;
      });
      const { data } = await refreshPromise;
      store.dispatch(credentialsSet({ user: data.user, accessToken: data.accessToken }));
      config.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(config);
    } catch (refreshError) {
      store.dispatch(loggedOut());
      return Promise.reject(refreshError);
    }
  },
);
