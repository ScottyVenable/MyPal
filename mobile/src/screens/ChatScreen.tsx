import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  IconButton,
  Card,
  Text,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import apiClient from '../services/api';
import { Message } from '../types';

export default function ChatScreen() {
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getChatHistory(50);
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      ts: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSending(true);

    try {
      const response = await apiClient.sendMessage(inputText);
      
      const palMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'pal',
        text: response.reply || 'No response',
        ts: Date.now(),
        kind: response.kind,
      };

      setMessages(prev => [...prev, palMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <Card
        style={[
          styles.messageCard,
          isUser ? styles.userMessage : styles.palMessage,
        ]}
      >
        <Card.Content>
          <Text variant="labelSmall" style={styles.messageLabel}>
            {isUser ? 'You' : 'MyPal'}
          </Text>
          <Text variant="bodyLarge">{item.text}</Text>
          {item.kind && (
            <Text variant="labelSmall" style={styles.kindLabel}>
              {item.kind}
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        inverted={false}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          mode="outlined"
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          style={styles.input}
          multiline
          maxLength={500}
          disabled={sending}
        />
        <IconButton
          icon="send"
          size={24}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
          loading={sending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 8,
  },
  messageCard: {
    marginBottom: 8,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#E3F2FD',
  },
  palMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
  },
  messageLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  kindLabel: {
    marginTop: 4,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    marginRight: 8,
    maxHeight: 100,
  },
});
