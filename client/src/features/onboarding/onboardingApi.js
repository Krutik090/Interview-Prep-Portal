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
    parseResume: builder.mutation({
      query: (formData) => ({ url: '/onboarding/parse-resume', method: 'post', data: formData }),
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
  useParseResumeMutation,
  useGetOnboardingStatusQuery,
} = onboardingApi;
