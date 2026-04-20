import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  type ListRenderItemInfo,
} from 'react-native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { PaperPlaneRight, Robot } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAI } from '@/store/AIContext';
import { MessageBubble } from '@/components/MessageBubble';
import { colors, spacing, borderRadius } from '@/theme';
import { generateId } from '@/utils/helpers';
import { StorageService, STORAGE_KEYS } from '@/services/StorageService';
import type { ChatMessage } from '@/types';

export function ChatScreen(): React.JSX.Element {
  const { processMessage, isProcessing, isInitialized } = useAI();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const typingDots = useRef(new Animated.Value(0)).current;

  // Load persisted messages on mount
  useEffect(() => {
    async function loadMessages() {
      try {
        const saved = await StorageService.load<ChatMessage[]>(
          STORAGE_KEYS.CHAT_HISTORY,
        );
        if (saved && saved.length > 0) {
          setMessages(saved);
        }
      } catch (error) {
        console.error('[ChatScreen] Failed to load messages:', error);
      }
    }
    loadMessages();
  }, []);

  // Persist messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      StorageService.save(STORAGE_KEYS.CHAT_HISTORY, messages);
    }
  }, [messages]);

  // Typing indicator animation
  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingDots, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(typingDots, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      typingDots.setValue(0);
    }
  }, [isProcessing, typingDots]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isProcessing) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      text,
      isUser: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    try {
      const response = await processMessage(text);
      const aiMessage: ChatMessage = {
        id: generateId(),
        text: response.text,
        isUser: false,
        timestamp: Date.now(),
        memoryClassification: response.processedInput.memoryClassification,
        sentiment: response.processedInput.sentiment.score,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateId(),
        text: 'I had trouble processing that. Please try again.',
        isUser: false,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error('[ChatScreen] Process error:', error);
    }
  }, [inputText, isProcessing, processMessage]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ChatMessage>) => (
      <MessageBubble message={item} isUser={item.isUser} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Robot size={48} color={colors.primary} weight="duotone" />
        </View>
        <Text style={styles.emptyTitle}>Welcome to MyPal</Text>
        <Text style={styles.emptySubtitle}>
          Your AI companion is ready to chat. Send a message to get started.
        </Text>
      </View>
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Robot size={22} color={colors.primary} weight="fill" />
        <Text style={styles.headerTitle}>MyPal</Text>
        {!isInitialized && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            messages.length === 0
              ? styles.emptyListContent
              : styles.listContent
          }
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          showsVerticalScrollIndicator={false}
        />

        {isProcessing && (
          <Animated.View
            style={[styles.typingIndicator, { opacity: typingDots }]}
          >
            <Robot size={14} color={colors.primary} weight="fill" />
            <Text style={styles.typingText}>MyPal is thinking...</Text>
          </Animated.View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            textColor={colors.text}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
            maxLength={2000}
            disabled={!isInitialized}
          />
          <View
            style={[
              styles.sendButton,
              inputText.trim()
                ? styles.sendButtonActive
                : styles.sendButtonInactive,
            ]}
          >
            <PaperPlaneRight
              size={20}
              color={
                inputText.trim() ? colors.onPrimary : colors.textSecondary
              }
              weight="fill"
              onPress={handleSend}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  typingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    fontSize: 15,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: colors.surfaceVariant,
  },
});
