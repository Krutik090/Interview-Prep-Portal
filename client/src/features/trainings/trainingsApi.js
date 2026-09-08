import { apiSlice } from '../../app/apiSlice.js';

// Single shared API surface for /trainings and its nested /modules routes —
// used by both the student catalog pages and the admin management pages,
// since they hit the exact same backend endpoints (the API varies its
// response/authorization by role, not by a different route).
export const trainingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listTrainings: builder.query({
      query: (params) => ({ url: '/trainings', params }),
      providesTags: ['Training'],
    }),
    getTraining: builder.query({
      query: (programId) => ({ url: `/trainings/${programId}` }),
      providesTags: (result, error, programId) => [{ type: 'Training', id: programId }],
    }),
    createTraining: builder.mutation({
      query: (data) => ({ url: '/trainings', method: 'post', data }),
      invalidatesTags: ['Training'],
    }),
    updateTraining: builder.mutation({
      query: ({ programId, ...data }) => ({ url: `/trainings/${programId}`, method: 'patch', data }),
      invalidatesTags: ['Training'],
    }),
    deleteTraining: builder.mutation({
      query: (programId) => ({ url: `/trainings/${programId}`, method: 'delete' }),
      invalidatesTags: ['Training'],
    }),
    setTrainingPublishStatus: builder.mutation({
      query: ({ programId, publish }) => ({
        url: `/trainings/${programId}/publish`,
        method: 'patch',
        data: { publish },
      }),
      invalidatesTags: ['Training'],
    }),
    reorderModules: builder.mutation({
      query: ({ programId, moduleOrder }) => ({
        url: `/trainings/${programId}/modules/reorder`,
        method: 'patch',
        data: { moduleOrder },
      }),
      invalidatesTags: (result, error, { programId }) => [{ type: 'Training', id: programId }],
    }),

    listModules: builder.query({
      query: (programId) => ({ url: `/trainings/${programId}/modules` }),
      providesTags: (result, error, programId) => [{ type: 'Module', id: programId }],
    }),
    getModule: builder.query({
      query: ({ programId, moduleId }) => ({ url: `/trainings/${programId}/modules/${moduleId}` }),
    }),
    createModule: builder.mutation({
      query: ({ programId, ...data }) => ({
        url: `/trainings/${programId}/modules`,
        method: 'post',
        data,
      }),
      invalidatesTags: (result, error, { programId }) => [{ type: 'Module', id: programId }],
    }),
    updateModule: builder.mutation({
      query: ({ programId, moduleId, ...data }) => ({
        url: `/trainings/${programId}/modules/${moduleId}`,
        method: 'patch',
        data,
      }),
      invalidatesTags: (result, error, { programId }) => [{ type: 'Module', id: programId }],
    }),
    deleteModule: builder.mutation({
      query: ({ programId, moduleId }) => ({
        url: `/trainings/${programId}/modules/${moduleId}`,
        method: 'delete',
      }),
      invalidatesTags: (result, error, { programId }) => [{ type: 'Module', id: programId }],
    }),
    requestModuleAiDraft: builder.mutation({
      query: ({ programId, moduleId, ...data }) => ({
        url: `/trainings/${programId}/modules/${moduleId}/ai-draft`,
        method: 'post',
        data,
      }),
    }),
  }),
});

export const {
  useListTrainingsQuery,
  useGetTrainingQuery,
  useCreateTrainingMutation,
  useUpdateTrainingMutation,
  useDeleteTrainingMutation,
  useSetTrainingPublishStatusMutation,
  useReorderModulesMutation,
  useListModulesQuery,
  useGetModuleQuery,
  useCreateModuleMutation,
  useUpdateModuleMutation,
  useDeleteModuleMutation,
  useRequestModuleAiDraftMutation,
} = trainingsApi;
