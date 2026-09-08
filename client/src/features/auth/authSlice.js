import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null, // { id, email, role, onboardingCompleted }
  accessToken: null, // kept in memory only, never localStorage
  status: 'idle', // 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsSet(state, action) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = 'authenticated';
    },
    loggedOut(state) {
      state.user = null;
      state.accessToken = null;
      state.status = 'unauthenticated';
    },
    userPatched(state, action) {
      if (state.user) {
        Object.assign(state.user, action.payload);
      }
    },
  },
});

export const { credentialsSet, loggedOut, userPatched } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectAuthStatus = (state) => state.auth.status;
