import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Text, Card } from 'react-native-paper';
import Svg, { Circle, Line } from 'react-native-svg';
import { Brain as BrainIcon, Atom, Lightning } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAI } from '@/store/AIContext';
import { NeuralRegionView } from '@/components/NeuralRegionView';
import { colors, spacing, borderRadius, regionColors } from '@/theme';
import { getRegionColor } from '@/utils/helpers';
import type { NeuralRegion, NeuralEvent } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SVG_SIZE = SCREEN_WIDTH - spacing.md * 2;
const CENTER_X = SVG_SIZE / 2;
const CENTER_Y = SVG_SIZE / 2;
const ORBIT_RADIUS = SVG_SIZE * 0.32;

interface RegionLayout {
  cx: number;
  cy: number;
}

function getRegionLayouts(count: number): RegionLayout[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      cx: CENTER_X + ORBIT_RADIUS * Math.cos(angle),
      cy: CENTER_Y + ORBIT_RADIUS * Math.sin(angle),
    };
  });
}

export function BrainScreen(): React.JSX.Element {
  const { getNeuralState, onNeuralEvent, isInitialized } = useAI();
  const [regions, setRegions] = useState<NeuralRegion[]>([]);
  const [activeRegions, setActiveRegions] = useState<Set<string>>(new Set());
  const [selectedRegion, setSelectedRegion] = useState<NeuralRegion | null>(
    null,
  );
  const [totalNeurons, setTotalNeurons] = useState(0);
  const [totalConnections, setTotalConnections] = useState(0);
  const [recentEvents, setRecentEvents] = useState<NeuralEvent[]>([]);

  const refreshState = useCallback(() => {
    if (!isInitialized) return;
    const state = getNeuralState();
    setRegions(state.regions);
    setTotalConnections(state.connections.length);
    setTotalNeurons(
      state.regions.reduce((acc, r) => acc + r.neurons.length, 0),
    );
  }, [getNeuralState, isInitialized]);

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 3000);
    return () => clearInterval(interval);
  }, [refreshState]);

  useEffect(() => {
    if (!isInitialized) return;
    const unsub = onNeuralEvent((event: NeuralEvent) => {
      setActiveRegions((prev) => {
        const next = new Set(prev);
        next.add(event.regionId);
        return next;
      });
      setRecentEvents((prev) => [event, ...prev].slice(0, 20));

      // Clear active state after animation
      setTimeout(() => {
        setActiveRegions((prev) => {
          const next = new Set(prev);
          next.delete(event.regionId);
          return next;
        });
      }, 1200);
    });
    return unsub;
  }, [isInitialized, onNeuralEvent]);

  const layouts = getRegionLayouts(regions.length);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <BrainIcon size={22} color={colors.primary} weight="fill" />
        <Text style={styles.headerTitle}>Neural Network</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* SVG visualization */}
        <View style={styles.svgContainer}>
          <Svg width={SVG_SIZE} height={SVG_SIZE}>
            {/* Connection lines between regions */}
            {regions.map((region, i) =>
              regions.slice(i + 1).map((other, j) => {
                const layout1 = layouts[i];
                const layout2 = layouts[i + 1 + j];
                if (!layout1 || !layout2) return null;
                const isActive =
                  activeRegions.has(region.id) ||
                  activeRegions.has(other.id);
                return (
                  <Line
                    key={`${region.id}-${other.id}`}
                    x1={layout1.cx}
                    y1={layout1.cy}
                    x2={layout2.cx}
                    y2={layout2.cy}
                    stroke={isActive ? colors.accent : colors.border}
                    strokeWidth={isActive ? 1.5 : 0.5}
                    opacity={isActive ? 0.8 : 0.3}
                  />
                );
              }),
            )}

            {/* Brain regions */}
            {regions.map((region, i) => {
              const layout = layouts[i];
              if (!layout) return null;
              return (
                <NeuralRegionView
                  key={region.id}
                  regionId={region.id}
                  name={region.name}
                  neuronCount={region.neurons.length}
                  cx={layout.cx}
                  cy={layout.cy}
                  isActive={activeRegions.has(region.id)}
                  onPress={() => setSelectedRegion(region)}
                />
              );
            })}

            {/* Center node */}
            <Circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={12}
              fill={colors.primary}
              opacity={0.6}
            />
          </Svg>

          {/* Overlay touch targets */}
          {regions.map((region, i) => {
            const layout = layouts[i];
            if (!layout) return null;
            const hitSize = 60;
            return (
              <TouchableOpacity
                key={`touch-${region.id}`}
                style={[
                  styles.touchTarget,
                  {
                    left: layout.cx - hitSize / 2,
                    top: layout.cy - hitSize / 2,
                    width: hitSize,
                    height: hitSize,
                  },
                ]}
                onPress={() => setSelectedRegion(region)}
                activeOpacity={0.7}
              />
            );
          })}
        </View>

        {/* Region info card */}
        {selectedRegion && (
          <Card style={styles.infoCard}>
            <Card.Content>
              <View style={styles.infoHeader}>
                <View
                  style={[
                    styles.regionDot,
                    {
                      backgroundColor: getRegionColor(selectedRegion.id),
                    },
                  ]}
                />
                <Text style={styles.infoTitle}>{selectedRegion.name}</Text>
                <TouchableOpacity onPress={() => setSelectedRegion(null)}>
                  <Text style={styles.closeButton}>Close</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.infoDescription}>
                {selectedRegion.description}
              </Text>
              <View style={styles.infoStats}>
                <View style={styles.infoStat}>
                  <Atom size={14} color={colors.secondary} />
                  <Text style={styles.infoStatText}>
                    {selectedRegion.neurons.length} neurons
                  </Text>
                </View>
                <View style={styles.infoStat}>
                  <Lightning size={14} color={colors.warning} />
                  <Text style={styles.infoStatText}>
                    {activeRegions.has(selectedRegion.id)
                      ? 'Active'
                      : 'Idle'}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Legend */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Brain Regions</Text>
          <View style={styles.legendGrid}>
            {Object.entries(regionColors).map(([id, color]) => (
              <View key={id} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: color }]}
                />
                <Text style={styles.legendLabel}>
                  {id
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Network stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalNeurons}</Text>
            <Text style={styles.statLabel}>Neurons</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalConnections}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{recentEvents.length}</Text>
            <Text style={styles.statLabel}>Recent Events</Text>
          </View>
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
  svgContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  touchTarget: {
    position: 'absolute',
    borderRadius: 30,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  regionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  infoStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoStatText: {
    fontSize: 13,
    color: colors.text,
  },
  legendContainer: {
    marginBottom: spacing.md,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: '47%',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 4,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
