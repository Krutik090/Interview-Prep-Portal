import { apiSlice } from '../../app/apiSlice.js';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation({
      query: (body) => ({ url: '/auth/register', method: 'post', data: body }),
    }),
    login: builder.mutation({
      query: (body) => ({ url: '/auth/login', method: 'post', data: body }),
    }),
    refresh: builder.mutation({
      query: () => ({ url: '/auth/refresh', method: 'post' }),
    }),
    logout: builder.mutation({
      query: () => ({ url: '/auth/logout', method: 'post' }),
    }),
    getMe: builder.query({
      query: () => ({ url: '/auth/me' }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
} = authApi;
