// Profile slice
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import BackendService from '../services/BackendService';
import { Profile } from '../types';

interface ProfileState {
  profiles: Profile[];
  currentProfile: Profile | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  profiles: [],
  currentProfile: null,
  loading: false,
  error: null,
};

export const fetchProfiles = createAsyncThunk('profile/fetchProfiles', async () => {
  const response = await BackendService.getProfiles();
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data || [];
});

export const createProfile = createAsyncThunk('profile/createProfile', async (name: string) => {
  const response = await BackendService.createProfile(name);
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
});

export const loadProfile = createAsyncThunk('profile/loadProfile', async (id: string) => {
  const response = await BackendService.loadProfile(id);
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
});

export const deleteProfile = createAsyncThunk('profile/deleteProfile', async (id: string) => {
  const response = await BackendService.deleteProfile(id);
  if (!response.success) {
    throw new Error(response.error);
  }
  return id;
});

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfiles.fulfilled, (state, action) => {
        state.loading = false;
        state.profiles = action.payload;
      })
      .addCase(fetchProfiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch profiles';
      })
      .addCase(createProfile.fulfilled, (state, action) => {
        if (action.payload) {
          state.profiles.push(action.payload);
        }
      })
      .addCase(loadProfile.fulfilled, (state, action) => {
        state.currentProfile = action.payload || null;
      })
      .addCase(deleteProfile.fulfilled, (state, action) => {
        state.profiles = state.profiles.filter((p) => p.id !== action.payload);
        if (state.currentProfile?.id === action.payload) {
          state.currentProfile = null;
        }
      });
  },
});

export const { clearError } = profileSlice.actions;
export default profileSlice.reducer;
