import { MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'System',
};

/**
 * Color palette inspired by reference design:
 * Deep black backgrounds, vibrant purple accents, subtle glow effects,
 * clean minimal typography, and dark rounded cards.
 */
export const colors = {
  // Core purple accent family
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#6D28D9',
  primaryMuted: 'rgba(139, 92, 246, 0.15)',
  primaryGlow: 'rgba(139, 92, 246, 0.25)',

  // Secondary accent — cool teal for contrast
  secondary: '#7C3AED',
  secondaryLight: '#9F67FF',

  // Backgrounds — near-black with slight navy tint
  background: '#08081A',
  surface: '#0F0F24',
  surfaceVariant: '#161635',
  surfaceElevated: '#1C1C40',

  // Text
  text: '#F0F0F8',
  textSecondary: '#6B6B8A',
  textMuted: '#45455E',

  // Borders — very subtle
  border: '#1E1E38',
  borderLight: '#2A2A50',

  // Semantic
  accent: '#A78BFA',
  error: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',

  // On-color text
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onBackground: '#F0F0F8',
  onSurface: '#F0F0F8',
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
      level3: colors.surfaceElevated,
      level4: '#22224A',
      level5: '#282856',
    },
  },
  fonts: configureFonts({ config: fontConfig }),
};

/** Neural region colors — purple-centric palette matching the dark theme */
export const regionColors: Record<string, string> = {
  'sensory-input': '#F87171',
  'language-center': '#8B5CF6',
  'association-cortex': '#34D399',
  'frontal-lobe': '#FBBF24',
  'amygdala': '#F472B6',
  'memory-systems': '#38BDF8',
  'motor-output': '#A78BFA',
};
