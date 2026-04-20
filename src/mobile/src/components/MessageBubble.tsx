import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Robot, Tag } from 'phosphor-react-native';
import { colors, spacing, borderRadius } from '@/theme';
import { formatTimestamp } from '@/utils/helpers';
import type { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
  isUser: boolean;
}

export function MessageBubble({
  message,
  isUser,
}: MessageBubbleProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
      ]}
    >
      {!isUser && (
        <View style={styles.avatarContainer}>
          <Robot size={20} color={colors.primary} weight="fill" />
        </View>
      )}
      <View
        style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
      >
        <Text
          style={[styles.text, isUser ? styles.userText : styles.aiText]}
          selectable
        >
          {message.text}
        </Text>
        <View style={styles.footer}>
          {!isUser && message.memoryClassification && (
            <View style={styles.badge}>
              <Tag size={10} color={colors.secondary} weight="bold" />
              <Text style={styles.badgeText}>
                {message.memoryClassification}
              </Text>
            </View>
          )}
          <Text style={styles.timestamp}>
            {formatTimestamp(message.timestamp)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    alignSelf: 'flex-end',
    marginBottom: spacing.xs,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing.xs,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: colors.onPrimary,
  },
  aiText: {
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});
