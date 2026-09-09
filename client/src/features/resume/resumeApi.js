import { apiSlice } from '../../app/apiSlice.js';

export const resumeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getResumeEligibility: builder.query({
      query: () => ({ url: '/resume/eligibility' }),
    }),
    generateResume: builder.mutation({
      query: () => ({ url: '/resume/generate', method: 'post' }),
      invalidatesTags: ['Resume'],
    }),
    getResumeStatus: builder.query({
      query: () => ({ url: '/resume/status' }),
      providesTags: ['Resume'],
    }),
  }),
});

export const { useGetResumeEligibilityQuery, useGenerateResumeMutation, useGetResumeStatusQuery } = resumeApi;
