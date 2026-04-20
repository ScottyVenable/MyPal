import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { Trophy, Lightning, Star } from 'phosphor-react-native';
import { colors, spacing, borderRadius } from '@/theme';
import { formatXP } from '@/utils/helpers';
import type { EvolutionStage, StageCharacteristics } from '@/types';

interface EvolutionCardProps {
  stage: EvolutionStage;
  level: number;
  xp: number;
  xpToNext: number;
}

export function EvolutionCard({
  stage,
  level,
  xp,
  xpToNext,
}: EvolutionCardProps): React.JSX.Element {
  const progress = xpToNext > 0 ? xp / xpToNext : 0;

  const characteristicEntries = Object.entries(
    stage.characteristics,
  ) as Array<[keyof StageCharacteristics, number]>;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Trophy size={24} color={colors.warning} weight="fill" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.stageName}>{stage.name}</Text>
          <Text style={styles.stageDescription}>{stage.description}</Text>
        </View>
      </View>

      <View style={styles.levelRow}>
        <View style={styles.levelBadge}>
          <Star size={14} color={colors.warning} weight="fill" />
          <Text style={styles.levelText}>Level {level}</Text>
        </View>
        <View style={styles.xpContainer}>
          <Lightning size={14} color={colors.secondary} weight="fill" />
          <Text style={styles.xpText}>
            {formatXP(xp)} / {formatXP(xpToNext)} XP
          </Text>
        </View>
      </View>

      <ProgressBar
        progress={progress}
        color={colors.primary}
        style={styles.progressBar}
      />

      <View style={styles.traitsContainer}>
        <Text style={styles.traitsTitle}>Characteristics</Text>
        {characteristicEntries.map(([key, value]) => (
          <View key={key} style={styles.traitRow}>
            <Text style={styles.traitLabel}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
            <View style={styles.traitBarBg}>
              <View
                style={[styles.traitBarFill, { width: `${value * 100}%` }]}
              />
            </View>
            <Text style={styles.traitValue}>{(value * 100).toFixed(0)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
  },
  headerText: {
    flex: 1,
  },
  stageName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  stageDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpText: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    marginBottom: spacing.md,
  },
  traitsContainer: {
    marginTop: spacing.xs,
  },
  traitsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  traitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  traitLabel: {
    width: 80,
    fontSize: 12,
    color: colors.text,
  },
  traitBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.full,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  traitBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
  },
  traitValue: {
    width: 36,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});
