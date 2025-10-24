// Example reusable component - Message Bubble

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, IconButton } from 'react-native-paper';
import { Message } from '../types';
import { formatTimestamp } from '../utils';

interface MessageBubbleProps {
  message: Message;
  onReinforce?: (messageId: string) => void;
}

export default function MessageBubble({ message, onReinforce }: MessageBubbleProps) {
  const isUser = message.sender === 'user';

  return (
    <Card
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.palBubble,
      ]}
    >
      <Card.Content>
        <Text variant="labelSmall" style={styles.sender}>
          {isUser ? 'You' : 'MyPal'}
        </Text>
        <Text variant="bodyLarge">{message.content}</Text>
        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.timestamp}>
            {formatTimestamp(message.timestamp)}
          </Text>
          {!isUser && onReinforce && (
            <IconButton
              icon={message.reinforced ? 'star' : 'star-outline'}
              size={16}
              onPress={() => onReinforce(message.id)}
              iconColor={message.reinforced ? '#FFD700' : undefined}
            />
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  bubble: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#E3F2FD',
  },
  palBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
  },
  sender: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    opacity: 0.6,
  },
});
