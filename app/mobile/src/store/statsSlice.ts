// Stats slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import BackendService from '../services/BackendService';
import { Stats } from '../types';

interface StatsState {
  stats: Stats | null;
  loading: boolean;
  error: string | null;
}

const initialState: StatsState = {
  stats: null,
  loading: false,
  error: null,
};

export const fetchStats = createAsyncThunk('stats/fetchStats', async () => {
  const response = await BackendService.getStats();
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
});

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    clearStats: (state) => {
      state.stats = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload || null;
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch stats';
      });
  },
});

export const { clearStats } = statsSlice.actions;
export default statsSlice.reducer;
