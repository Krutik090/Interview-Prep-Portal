import { apiSlice } from '../../app/apiSlice.js';

export const enrollmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    enroll: builder.mutation({
      query: (programId) => ({ url: '/enrollments', method: 'post', data: { programId } }),
      invalidatesTags: ['Enrollment'],
    }),
    listMyEnrollments: builder.query({
      query: () => ({ url: '/enrollments/me' }),
      providesTags: ['Enrollment'],
    }),
    getEnrollmentDetail: builder.query({
      query: (enrollmentId) => ({ url: `/enrollments/${enrollmentId}` }),
      providesTags: (result, error, enrollmentId) => [{ type: 'Enrollment', id: enrollmentId }],
    }),
    listRoster: builder.query({
      query: (programId) => ({ url: `/enrollments/program/${programId}/roster` }),
    }),
  }),
});

export const {
  useEnrollMutation,
  useListMyEnrollmentsQuery,
  useGetEnrollmentDetailQuery,
  useListRosterQuery,
} = enrollmentsApi;
