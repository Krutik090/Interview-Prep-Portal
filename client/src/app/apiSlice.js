import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '../lib/axiosBaseQuery.js';

// Shared RTK Query instance — each feature injects its own endpoints
// (see features/*/*Api.js) so ownership of endpoint definitions stays
// alongside the feature that uses them.
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Profile', 'Onboarding', 'Training', 'Module', 'Enrollment', 'Submission'],
  endpoints: () => ({}),
});
