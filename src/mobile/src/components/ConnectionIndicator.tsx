import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { WifiHigh, WifiSlash, WifiMedium } from 'phosphor-react-native';
import { colors, spacing, borderRadius } from '@/theme';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  onPress?: () => void;
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { color: string; label: string }
> = {
  connected: { color: colors.success, label: 'Connected' },
  disconnected: { color: colors.error, label: 'Disconnected' },
  connecting: { color: colors.primary, label: 'Connecting...' },
};

export function ConnectionIndicator({
  status,
  onPress,
  showLabel = true,
}: ConnectionIndicatorProps): React.JSX.Element {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const config = STATUS_CONFIG[status];

  useEffect(() => {
    if (status === 'connecting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const Icon =
    status === 'connected'
      ? WifiHigh
      : status === 'connecting'
        ? WifiMedium
        : WifiSlash;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: config.color, opacity: pulseAnim },
        ]}
      />
      <Icon size={16} color={config.color} weight="bold" />
      {showLabel && <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceVariant,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
