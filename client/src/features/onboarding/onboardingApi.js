import { apiSlice } from '../../app/apiSlice.js';

export const onboardingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getQuestionnaire: builder.query({
      query: () => ({ url: '/onboarding/questionnaire' }),
    }),
    submitOnboarding: builder.mutation({
      query: (answers) => ({ url: '/onboarding/submit', method: 'post', data: answers }),
      invalidatesTags: ['Profile', 'Onboarding'],
    }),
    getOnboardingStatus: builder.query({
      query: () => ({ url: '/onboarding/status' }),
      providesTags: ['Onboarding'],
    }),
  }),
});

export const {
  useGetQuestionnaireQuery,
  useSubmitOnboardingMutation,
  useGetOnboardingStatusQuery,
} = onboardingApi;
