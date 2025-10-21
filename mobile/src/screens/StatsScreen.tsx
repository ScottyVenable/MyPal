import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import {
  Card,
  Text,
  ProgressBar,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { LineChart, BarChart } from 'react-native-chart-kit';
import apiClient from '../services/api';
import { Stats } from '../types';

export default function StatsScreen() {
  const theme = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await apiClient.getStats();
      setStats(response);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading stats...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="titleLarge">No stats available</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
    labelColor: (opacity = 1) => theme.colors.onSurface,
    style: {
      borderRadius: 16,
    },
  };

  const personalityData = {
    labels: ['Curious', 'Logical', 'Social', 'Agreeable', 'Cautious'],
    datasets: [
      {
        data: [
          stats.personalityTraits.curious,
          stats.personalityTraits.logical,
          stats.personalityTraits.social,
          stats.personalityTraits.agreeable,
          stats.personalityTraits.cautious,
        ],
      },
    ],
  };

  const screenWidth = Dimensions.get('window').width;
  const xpProgress = stats.xpToNextLevel > 0 ? stats.xp / stats.xpToNextLevel : 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge">Level {stats.level}</Text>
          <Text variant="bodyMedium" style={styles.xpText}>
            {stats.xp} / {stats.xpToNextLevel} XP
          </Text>
          <ProgressBar progress={xpProgress} style={styles.progressBar} />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Activity
          </Text>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium">{stats.messageCount}</Text>
              <Text variant="bodySmall">Messages</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium">{stats.memoryCount}</Text>
              <Text variant="bodySmall">Memories</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium">{stats.vocabularySize}</Text>
              <Text variant="bodySmall">Words</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Personality Traits
          </Text>
          <BarChart
            data={personalityData}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            yAxisSuffix=""
            fromZero
            showBarTops={false}
            style={styles.chart}
          />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  xpText: {
    marginTop: 8,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});
