import { apiClient } from './apiClient.js';

// Bridges RTK Query to our existing axios instance so every request still
// goes through the shared Bearer-token/refresh-token interceptor chain in
// apiClient.js, instead of duplicating that logic in a second HTTP client.
export function axiosBaseQuery() {
  return async ({ url, method = 'get', data, params }) => {
    try {
      const result = await apiClient.request({ url, method, data, params });
      return { data: result.data };
    } catch (error) {
      return {
        error: {
          status: error.response?.status,
          data: error.response?.data ?? error.message,
        },
      };
    }
  };
}
