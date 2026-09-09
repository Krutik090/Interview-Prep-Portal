import { apiSlice } from '../../app/apiSlice.js';

export const adminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query({
      query: () => ({ url: '/admin/dashboard/stats' }),
    }),
    getAiUsage: builder.query({
      query: () => ({ url: '/admin/ai-usage' }),
    }),
    listStudents: builder.query({
      query: (params) => ({ url: '/admin/students', params }),
    }),
    getStudentProgress: builder.query({
      query: (userId) => ({ url: `/admin/students/${userId}/progress` }),
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetAiUsageQuery,
  useListStudentsQuery,
  useGetStudentProgressQuery,
} = adminApi;
