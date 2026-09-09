import { apiSlice } from '../../app/apiSlice.js';

export const submissionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    markModuleRead: builder.mutation({
      query: ({ programId, moduleId }) => ({
        url: `/trainings/${programId}/modules/${moduleId}/mark-read`,
        method: 'post',
      }),
      invalidatesTags: ['Enrollment'],
    }),
    submitQuiz: builder.mutation({
      query: ({ moduleId, answers }) => ({
        url: `/submissions/quiz/${moduleId}`,
        method: 'post',
        data: { answers },
      }),
      invalidatesTags: ['Enrollment'],
    }),
    startAiInterview: builder.mutation({
      query: (moduleId) => ({ url: `/submissions/ai-interview/${moduleId}/start`, method: 'post' }),
    }),
    getAiInterview: builder.query({
      query: (submissionId) => ({ url: `/submissions/ai-interview/${submissionId}` }),
      providesTags: (result, error, submissionId) => [{ type: 'Submission', id: submissionId }],
    }),
    answerAiInterview: builder.mutation({
      query: ({ submissionId, answers }) => ({
        url: `/submissions/ai-interview/${submissionId}/answer`,
        method: 'post',
        data: { answers },
      }),
      invalidatesTags: (result, error, { submissionId }) => [
        { type: 'Submission', id: submissionId },
        'Enrollment',
      ],
    }),
    submitGd: builder.mutation({
      query: ({ moduleId, formData }) => ({
        url: `/submissions/gd/${moduleId}`,
        method: 'post',
        data: formData,
      }),
      invalidatesTags: ['Enrollment'],
    }),
    listGdQueue: builder.query({
      query: () => ({ url: '/submissions/gd/queue' }),
      providesTags: ['Submission'],
    }),
    reviewGd: builder.mutation({
      query: ({ submissionId, ...data }) => ({
        url: `/submissions/gd/${submissionId}/review`,
        method: 'patch',
        data,
      }),
      invalidatesTags: ['Submission', 'Enrollment'],
    }),
    requestGdAiAssist: builder.mutation({
      query: (submissionId) => ({ url: `/submissions/gd/${submissionId}/ai-assist-review`, method: 'post' }),
    }),
  }),
});

export const {
  useMarkModuleReadMutation,
  useSubmitQuizMutation,
  useStartAiInterviewMutation,
  useGetAiInterviewQuery,
  useAnswerAiInterviewMutation,
  useSubmitGdMutation,
  useListGdQueueQuery,
  useReviewGdMutation,
  useRequestGdAiAssistMutation,
} = submissionsApi;
