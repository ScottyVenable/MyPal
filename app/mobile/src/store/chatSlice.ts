// Chat slice
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import BackendService from '../services/BackendService';
import { Message, ChatResponse } from '../types';

interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  typing: boolean;
}

const initialState: ChatState = {
  messages: [],
  loading: false,
  error: null,
  typing: false,
};

export const fetchChatLog = createAsyncThunk('chat/fetchChatLog', async () => {
  const response = await BackendService.getChatLog();
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data || [];
});

export const sendMessage = createAsyncThunk('chat/sendMessage', async (message: string) => {
  const response = await BackendService.sendMessage(message);
  if (!response.success) {
    throw new Error(response.error);
  }
  return { userMessage: message, response: response.data };
});

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.typing = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatLog.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatLog.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload;
      })
      .addCase(fetchChatLog.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch chat log';
      })
      .addCase(sendMessage.pending, (state) => {
        state.typing = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.typing = false;
        const { userMessage, response } = action.payload;
        
        // Add user message
        state.messages.push({
          id: Date.now().toString(),
          sender: 'user',
          content: userMessage,
          timestamp: new Date().toISOString(),
        });
        
        // Add pal's response
        if (response) {
          state.messages.push({
            id: (Date.now() + 1).toString(),
            sender: 'pal',
            content: response.reply,
            timestamp: new Date().toISOString(),
          });
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.typing = false;
        state.error = action.error.message || 'Failed to send message';
      });
  },
});

export const { addMessage, clearMessages, setTyping } = chatSlice.actions;
export default chatSlice.reducer;
