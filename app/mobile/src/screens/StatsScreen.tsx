// Stats Screen
import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, ProgressBar, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchStats } from '../store/statsSlice';

export default function StatsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { stats, loading, error } = useSelector((state: RootState) => state.stats);

  useEffect(() => {
    dispatch(fetchStats());
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading stats...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.centerContainer}>
        <Text>No stats available</Text>
      </View>
    );
  }

  const xpProgress = stats.xp / stats.nextLevelXP;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall">Level {stats.level}</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {stats.xp} / {stats.nextLevelXP} XP
          </Text>
          <ProgressBar progress={xpProgress} style={styles.progressBar} />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Statistics" />
        <Card.Content>
          <View style={styles.statRow}>
            <Text variant="bodyLarge">Total Messages:</Text>
            <Text variant="bodyLarge" style={styles.statValue}>
              {stats.totalMessages}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text variant="bodyLarge">Words Learned:</Text>
            <Text variant="bodyLarge" style={styles.statValue}>
              {stats.wordsLearned}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text variant="bodyLarge">Cognitive Points:</Text>
            <Text variant="bodyLarge" style={styles.statValue}>
              {stats.cognitivePoints}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Personality Traits" />
        <Card.Content>
          <View style={styles.traitContainer}>
            <Text>Curious</Text>
            <ProgressBar progress={stats.personality.curious / 100} style={styles.traitBar} />
            <Text>{stats.personality.curious}%</Text>
          </View>
          <View style={styles.traitContainer}>
            <Text>Logical</Text>
            <ProgressBar progress={stats.personality.logical / 100} style={styles.traitBar} />
            <Text>{stats.personality.logical}%</Text>
          </View>
          <View style={styles.traitContainer}>
            <Text>Social</Text>
            <ProgressBar progress={stats.personality.social / 100} style={styles.traitBar} />
            <Text>{stats.personality.social}%</Text>
          </View>
          <View style={styles.traitContainer}>
            <Text>Agreeable</Text>
            <ProgressBar progress={stats.personality.agreeable / 100} style={styles.traitBar} />
            <Text>{stats.personality.agreeable}%</Text>
          </View>
          <View style={styles.traitContainer}>
            <Text>Cautious</Text>
            <ProgressBar progress={stats.personality.cautious / 100} style={styles.traitBar} />
            <Text>{stats.personality.cautious}%</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Cognitive Lobes" />
        <Card.Content>
          <View style={styles.lobeContainer}>
            <Text variant="bodyLarge">Language: {stats.lobes.language}</Text>
          </View>
          <View style={styles.lobeContainer}>
            <Text variant="bodyLarge">Logic: {stats.lobes.logic}</Text>
          </View>
          <View style={styles.lobeContainer}>
            <Text variant="bodyLarge">Emotion: {stats.lobes.emotion}</Text>
          </View>
          <View style={styles.lobeContainer}>
            <Text variant="bodyLarge">Memory: {stats.lobes.memory}</Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statValue: {
    fontWeight: 'bold',
  },
  traitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  traitBar: {
    flex: 1,
    marginHorizontal: 12,
  },
  lobeContainer: {
    marginBottom: 8,
  },
  loadingText: {
    marginTop: 16,
  },
  error: {
    color: 'red',
    textAlign: 'center',
  },
});
