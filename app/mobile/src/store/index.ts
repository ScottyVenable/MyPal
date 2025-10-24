// Redux store configuration
import { configureStore } from '@reduxjs/toolkit';
import profileReducer from './profileSlice';
import chatReducer from './chatSlice';
import statsReducer from './statsSlice';

export const store = configureStore({
  reducer: {
    profile: profileReducer,
    chat: chatReducer,
    stats: statsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
