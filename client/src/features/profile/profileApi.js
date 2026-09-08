import { apiSlice } from '../../app/apiSlice.js';

export const profileApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyProfile: builder.query({
      query: () => ({ url: '/profile/me' }),
      providesTags: ['Profile'],
    }),
    updateMyProfile: builder.mutation({
      query: (updates) => ({ url: '/profile/me', method: 'patch', data: updates }),
      invalidatesTags: ['Profile'],
    }),
    uploadAvatar: builder.mutation({
      query: (formData) => ({ url: '/profile/me/avatar', method: 'post', data: formData }),
      invalidatesTags: ['Profile'],
    }),
    refreshAiSummary: builder.mutation({
      query: () => ({ url: '/profile/me/refresh-ai-summary', method: 'post' }),
    }),
  }),
});

export const {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useUploadAvatarMutation,
  useRefreshAiSummaryMutation,
} = profileApi;
