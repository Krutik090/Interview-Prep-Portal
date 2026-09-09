import { apiSlice } from '../../app/apiSlice.js';

export const groomingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listGrooming: builder.query({
      query: (params) => ({ url: '/grooming', params }),
      providesTags: ['Grooming'],
    }),
    getGrooming: builder.query({
      query: (id) => ({ url: `/grooming/${id}` }),
    }),
    createGrooming: builder.mutation({
      query: (data) => ({ url: '/grooming', method: 'post', data }),
      invalidatesTags: ['Grooming'],
    }),
    updateGrooming: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/grooming/${id}`, method: 'patch', data }),
      invalidatesTags: ['Grooming'],
    }),
    deleteGrooming: builder.mutation({
      query: (id) => ({ url: `/grooming/${id}`, method: 'delete' }),
      invalidatesTags: ['Grooming'],
    }),
    setGroomingPublishStatus: builder.mutation({
      query: ({ id, publish }) => ({ url: `/grooming/${id}/publish`, method: 'patch', data: { publish } }),
      invalidatesTags: ['Grooming'],
    }),
    requestGroomingAiDraft: builder.mutation({
      query: (topic) => ({ url: '/grooming/ai-draft', method: 'post', data: { topic } }),
    }),
    getPersonalizedTip: builder.query({
      query: (id) => ({ url: `/grooming/${id}/personalized-tip` }),
    }),
  }),
});

export const {
  useListGroomingQuery,
  useGetGroomingQuery,
  useCreateGroomingMutation,
  useUpdateGroomingMutation,
  useDeleteGroomingMutation,
  useSetGroomingPublishStatusMutation,
  useRequestGroomingAiDraftMutation,
  useGetPersonalizedTipQuery,
} = groomingApi;
