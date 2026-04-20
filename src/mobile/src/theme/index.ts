import { MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'System',
};

export const colors = {
  primary: '#6C5CE7',
  secondary: '#00CEC9',
  background: '#1A1A2E',
  surface: '#16213E',
  text: '#EAEAEA',
  textSecondary: '#A0A0B8',
  error: '#FF6B6B',
  border: '#2A2A4A',
  accent: '#A29BFE',
  success: '#00B894',
  warning: '#FDCB6E',
  surfaceVariant: '#1E2A45',
  onPrimary: '#FFFFFF',
  onSecondary: '#000000',
  onBackground: '#EAEAEA',
  onSurface: '#EAEAEA',
  onError: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
    onPrimary: colors.onPrimary,
    onSecondary: colors.onSecondary,
    onBackground: colors.onBackground,
    onSurface: colors.onSurface,
    onError: colors.onError,
    surfaceVariant: colors.surfaceVariant,
    outline: colors.border,
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.surfaceVariant,
      level3: '#233054',
      level4: '#283660',
      level5: '#2D3C6B',
    },
  },
  fonts: configureFonts({ config: fontConfig }),
};

export const regionColors: Record<string, string> = {
  'sensory-input': '#FF6B6B',
  'language-center': '#6C5CE7',
  'association-cortex': '#00CEC9',
  'frontal-lobe': '#FDCB6E',
  'amygdala': '#E84393',
  'memory-systems': '#00B894',
  'motor-output': '#A29BFE',
};
