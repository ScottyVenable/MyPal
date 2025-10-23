// Chat Screen
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  IconButton,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { sendMessage, fetchChatLog } from '../store/chatSlice';
import { Message } from '../types';

export default function ChatScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { messages, typing, error } = useSelector((state: RootState) => state.chat);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    dispatch(fetchChatLog());
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    dispatch(sendMessage(inputText.trim()));
    setInputText('');
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <Card
      style={[
        styles.messageCard,
        item.sender === 'user' ? styles.userMessage : styles.palMessage,
      ]}
    >
      <Card.Content>
        <Text variant="labelSmall" style={styles.sender}>
          {item.sender === 'user' ? 'You' : 'MyPal'}
        </Text>
        <Text variant="bodyLarge">{item.content}</Text>
        <Text variant="bodySmall" style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge">Start a conversation with MyPal!</Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Your messages help MyPal learn and grow
            </Text>
          </View>
        }
      />

      {typing && (
        <View style={styles.typingContainer}>
          <ActivityIndicator size="small" />
          <Text style={styles.typingText}>MyPal is thinking...</Text>
        </View>
      )}

      {error && (
        <Text style={styles.error}>{error}</Text>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          maxLength={500}
          disabled={typing}
        />
        <IconButton
          icon="send"
          size={24}
          onPress={handleSend}
          disabled={!inputText.trim() || typing}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptySubtext: {
    marginTop: 8,
    opacity: 0.7,
  },
  messageCard: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#E3F2FD',
  },
  palMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
  },
  sender: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timestamp: {
    marginTop: 4,
    opacity: 0.6,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0F0F0',
  },
  typingText: {
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    padding: 8,
  },
});
