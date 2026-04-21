import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Switch,
  Button,
  Divider,
  Card,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import {
  GearSix,
  Globe,
  Key,
  Cube,
  Sliders,
  Thermometer,
  TrashSimple,
  Info,
  Moon,
  PlugsConnected,
} from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAI } from '@/store/AIContext';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { colors, spacing, borderRadius } from '@/theme';
import { StorageService, STORAGE_KEYS } from '@/services/StorageService';
import type { LMServerConfig } from '@/types';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export function SettingsScreen(): React.JSX.Element {
  const { getLMConfig, updateLMConfig, testConnection, isInitialized } =
    useAI();

  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [maxTokens, setMaxTokens] = useState(512);
  const [temperature, setTemperature] = useState(0.7);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (!isInitialized) return;
    const config = getLMConfig();
    setServerUrl(config.endpoint);
    setApiKey(config.apiKey ?? '');
    setModel(config.model);
    setMaxTokens(config.maxTokens);
    setTemperature(config.temperature);
  }, [isInitialized, getLMConfig]);

  const handleSaveConfig = useCallback(() => {
    const config: Partial<LMServerConfig> = {
      endpoint: serverUrl.trim(),
      apiKey: apiKey.trim() || undefined,
      model: model.trim(),
      maxTokens,
      temperature,
    };
    updateLMConfig(config);
    StorageService.save(STORAGE_KEYS.LM_CONFIG, {
      ...getLMConfig(),
      ...config,
    });
  }, [serverUrl, apiKey, model, maxTokens, temperature, updateLMConfig, getLMConfig]);

  const handleTestConnection = useCallback(async () => {
    handleSaveConfig();
    setConnectionStatus('connecting');
    try {
      const connected = await testConnection();
      setConnectionStatus(connected ? 'connected' : 'disconnected');
    } catch {
      setConnectionStatus('disconnected');
    }
  }, [handleSaveConfig, testConnection]);

  const handleClearData = useCallback(() => {
    Alert.alert(
      'Clear All Data',
      'This will delete all chat history, memories, and neural network state. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.clear();
              Alert.alert('Done', 'All data has been cleared. Restart the app for changes to take effect.');
            } catch (error) {
              console.error('[Settings] Clear data failed:', error);
            }
          },
        },
      ],
    );
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <GearSix size={22} color={colors.primary} weight="fill" />
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* LM Server Configuration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PlugsConnected size={18} color={colors.secondary} weight="fill" />
            <Text style={styles.sectionTitle}>LM Server Configuration</Text>
            <ConnectionIndicator
              status={connectionStatus}
              onPress={handleTestConnection}
              showLabel={false}
            />
          </View>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              {/* Server URL */}
              <View style={styles.fieldContainer}>
                <View style={styles.fieldLabel}>
                  <Globe size={16} color={colors.textSecondary} />
                  <Text style={styles.label}>Server URL</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="http://localhost:11434"
                  placeholderTextColor={colors.textSecondary}
                  textColor={colors.text}
                  underlineColor="transparent"
                  activeUnderlineColor={colors.primary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>

              {/* API Key */}
              <View style={styles.fieldContainer}>
                <View style={styles.fieldLabel}>
                  <Key size={16} color={colors.textSecondary} />
                  <Text style={styles.label}>API Key</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="Optional"
                  placeholderTextColor={colors.textSecondary}
                  textColor={colors.text}
                  underlineColor="transparent"
                  activeUnderlineColor={colors.primary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Model */}
              <View style={styles.fieldContainer}>
                <View style={styles.fieldLabel}>
                  <Cube size={16} color={colors.textSecondary} />
                  <Text style={styles.label}>Model</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={model}
                  onChangeText={setModel}
                  placeholder="llama2"
                  placeholderTextColor={colors.textSecondary}
                  textColor={colors.text}
                  underlineColor="transparent"
                  activeUnderlineColor={colors.primary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Max Tokens */}
              <View style={styles.fieldContainer}>
                <View style={styles.fieldLabelRow}>
                  <Sliders size={16} color={colors.textSecondary} />
                  <Text style={styles.label}>Max Tokens</Text>
                  <Text style={styles.sliderValue}>{maxTokens}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={64}
                  maximumValue={4096}
                  step={64}
                  value={maxTokens}
                  onValueChange={setMaxTokens}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                />
              </View>

              {/* Temperature */}
              <View style={styles.fieldContainer}>
                <View style={styles.fieldLabelRow}>
                  <Thermometer size={16} color={colors.textSecondary} />
                  <Text style={styles.label}>Temperature</Text>
                  <Text style={styles.sliderValue}>
                    {temperature.toFixed(2)}
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={2}
                  step={0.05}
                  value={temperature}
                  onValueChange={setTemperature}
                  minimumTrackTintColor={colors.secondary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.secondary}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <Button
                  mode="contained"
                  onPress={handleSaveConfig}
                  style={styles.saveButton}
                  buttonColor={colors.primary}
                  textColor={colors.onPrimary}
                >
                  Save
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleTestConnection}
                  style={styles.testButton}
                  textColor={colors.secondary}
                >
                  Test Connection
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>

        <Divider style={styles.divider} />

        {/* App Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <GearSix size={18} color={colors.accent} weight="fill" />
            <Text style={styles.sectionTitle}>App Settings</Text>
          </View>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              {/* Dark Mode Toggle */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Moon size={18} color={colors.textSecondary} weight="fill" />
                  <Text style={styles.settingLabel}>Dark Mode</Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  color={colors.primary}
                  disabled
                />
              </View>

              <Divider style={styles.inlineDivider} />

              {/* Clear Data */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <TrashSimple
                    size={18}
                    color={colors.error}
                    weight="fill"
                  />
                  <Text style={[styles.settingLabel, { color: colors.error }]}>
                    Clear All Data
                  </Text>
                </View>
                <Button
                  mode="text"
                  onPress={handleClearData}
                  textColor={colors.error}
                  compact
                >
                  Clear
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>

        <Divider style={styles.divider} />

        {/* About */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={18} color={colors.textSecondary} weight="fill" />
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.aboutTitle}>MyPal AI Companion</Text>
              <Text style={styles.aboutVersion}>Version 0.2.0-alpha</Text>
              <Text style={styles.aboutDescription}>
                An offline-first AI companion with authentic cognitive
                development, neural network simulation, and local language model
                support.
              </Text>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
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
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardContent: {
    gap: spacing.md,
  },
  fieldContainer: {
    gap: spacing.xs,
  },
  fieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    minWidth: 40,
    textAlign: 'right',
  },
  input: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
    fontSize: 14,
    height: 44,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  saveButton: {
    flex: 1,
    borderRadius: borderRadius.sm,
  },
  testButton: {
    flex: 1,
    borderRadius: borderRadius.sm,
    borderColor: colors.secondary,
  },
  divider: {
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingLabel: {
    fontSize: 14,
    color: colors.text,
  },
  inlineDivider: {
    backgroundColor: colors.border,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  aboutVersion: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  aboutDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
});
