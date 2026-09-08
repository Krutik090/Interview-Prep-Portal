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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || config._retried) {
      return Promise.reject(error);
    }
    config._retried = true;

    try {
      refreshPromise ??= apiClient.post('/auth/refresh').finally(() => {
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
