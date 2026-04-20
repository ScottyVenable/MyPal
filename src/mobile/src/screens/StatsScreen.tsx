import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card } from 'react-native-paper';
import {
  ChartBar,
  Brain,
  Database,
  TrendUp,
  Atom,
} from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-chart-kit';
import { useAI } from '@/store/AIContext';
import { EvolutionCard } from '@/components/EvolutionCard';
import { colors, spacing, borderRadius } from '@/theme';
import { formatXP } from '@/utils/helpers';
import type { EvolutionStage, NeuralRegion } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.md * 4;

const chartConfig = {
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  color: (opacity = 1) => `rgba(108, 92, 231, ${opacity})`,
  labelColor: () => colors.textSecondary,
  barPercentage: 0.6,
  decimalCount: 0,
  propsForBackgroundLines: {
    stroke: colors.border,
    strokeDasharray: '',
  },
};

export function StatsScreen(): React.JSX.Element {
  const {
    getEvolution,
    getLevel,
    getXP,
    getXPToNextLevel,
    getMemoryStats,
    getNeuralState,
    isInitialized,
  } = useAI();

  const [stage, setStage] = useState<EvolutionStage | null>(null);
  const [level, setLevel] = useState(1);
  const [xp, setXP] = useState(0);
  const [xpToNext, setXPToNext] = useState(100);
  const [memStats, setMemStats] = useState<{
    total: number;
    byType: Record<string, number>;
    averageImportance: number;
  }>({ total: 0, byType: {}, averageImportance: 0 });
  const [regions, setRegions] = useState<NeuralRegion[]>([]);
  const [totalConnections, setTotalConnections] = useState(0);

  const refresh = useCallback(() => {
    if (!isInitialized) return;
    setStage(getEvolution());
    setLevel(getLevel());
    setXP(getXP());
    setXPToNext(getXPToNextLevel());
    setMemStats(getMemoryStats());
    const ns = getNeuralState();
    setRegions(ns.regions);
    setTotalConnections(ns.connections.length);
  }, [
    isInitialized,
    getEvolution,
    getLevel,
    getXP,
    getXPToNextLevel,
    getMemoryStats,
    getNeuralState,
  ]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const totalNeurons = regions.reduce(
    (acc, r) => acc + r.neurons.length,
    0,
  );

  const memoryChartData = {
    labels: ['Ephemeral', 'Short', 'Long', 'Episodic'],
    datasets: [
      {
        data: [
          memStats.byType['ephemeral'] ?? 0,
          memStats.byType['short-term'] ?? 0,
          memStats.byType['long-term'] ?? 0,
          memStats.byType['episodic'] ?? 0,
        ],
      },
    ],
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <ChartBar size={22} color={colors.primary} weight="fill" />
        <Text style={styles.headerTitle}>Statistics</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Evolution Card */}
        {stage && (
          <EvolutionCard
            stage={stage}
            level={level}
            xp={xp}
            xpToNext={xpToNext}
          />
        )}

        {/* Neural Network Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Brain size={18} color={colors.secondary} weight="fill" />
            <Text style={styles.sectionTitle}>Neural Network</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Atom size={20} color={colors.accent} />
              <Text style={styles.statValue}>{totalNeurons}</Text>
              <Text style={styles.statLabel}>Total Neurons</Text>
            </View>
            <View style={styles.statCell}>
              <TrendUp size={20} color={colors.secondary} />
              <Text style={styles.statValue}>{totalConnections}</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
            <View style={styles.statCell}>
              <Brain size={20} color={colors.primary} />
              <Text style={styles.statValue}>{regions.length}</Text>
              <Text style={styles.statLabel}>Regions</Text>
            </View>
          </View>
        </View>

        {/* Memory Statistics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Database size={18} color={colors.warning} weight="fill" />
            <Text style={styles.sectionTitle}>Memory System</Text>
          </View>
          <Card style={styles.chartCard}>
            <Card.Content>
              <View style={styles.memSummaryRow}>
                <Text style={styles.memSummaryText}>
                  Total Memories: {memStats.total}
                </Text>
                <Text style={styles.memSummaryText}>
                  Avg Importance:{' '}
                  {(memStats.averageImportance * 100).toFixed(0)}%
                </Text>
              </View>
              {memStats.total > 0 && (
                <BarChart
                  data={memoryChartData}
                  width={CHART_WIDTH}
                  height={180}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  fromZero
                  showValuesOnTopOfBars
                  yAxisLabel=""
                  yAxisSuffix=""
                />
              )}
              {memStats.total === 0 && (
                <View style={styles.emptyChart}>
                  <Database size={32} color={colors.textSecondary} />
                  <Text style={styles.emptyChartText}>
                    No memories yet. Start chatting to build memories.
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        </View>

        {/* Region Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Brain size={18} color={colors.accent} weight="fill" />
            <Text style={styles.sectionTitle}>Region Breakdown</Text>
          </View>
          {regions.map((region) => (
            <View key={region.id} style={styles.regionRow}>
              <Text style={styles.regionName}>{region.name}</Text>
              <View style={styles.regionBarBg}>
                <View
                  style={[
                    styles.regionBarFill,
                    {
                      width: `${totalNeurons > 0 ? (region.neurons.length / totalNeurons) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.regionCount}>
                {region.neurons.length}
              </Text>
            </View>
          ))}
        </View>

        {/* Growth Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendUp size={18} color={colors.success} weight="fill" />
            <Text style={styles.sectionTitle}>Growth Summary</Text>
          </View>
          <Card style={styles.growthCard}>
            <Card.Content style={styles.growthContent}>
              <View style={styles.growthItem}>
                <Text style={styles.growthLabel}>Level</Text>
                <Text style={styles.growthValue}>{level}</Text>
              </View>
              <View style={styles.growthDivider} />
              <View style={styles.growthItem}>
                <Text style={styles.growthLabel}>Total XP</Text>
                <Text style={styles.growthValue}>{formatXP(xp)}</Text>
              </View>
              <View style={styles.growthDivider} />
              <View style={styles.growthItem}>
                <Text style={styles.growthLabel}>Memories</Text>
                <Text style={styles.growthValue}>{memStats.total}</Text>
              </View>
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
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  headerTitle: {
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
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  memSummaryText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chart: {
    borderRadius: borderRadius.md,
    marginLeft: -spacing.md,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyChartText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  regionName: {
    width: 120,
    fontSize: 12,
    color: colors.text,
  },
  regionBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.full,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  regionBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  regionCount: {
    width: 30,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  growthCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  growthContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  growthItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  growthLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  growthValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  growthDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
});
