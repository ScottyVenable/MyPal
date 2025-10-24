// Brain Screen (placeholder for neural network visualization)
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import BackendService from '../services/BackendService';
import { NeuralNetwork } from '../types';

export default function BrainScreen() {
  const [network, setNetwork] = useState<NeuralNetwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNetwork = async () => {
    setLoading(true);
    setError(null);
    const response = await BackendService.getNeuralNetwork();
    if (response.success && response.data) {
      setNetwork(response.data);
    } else {
      setError(response.error || 'Failed to load neural network');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNetwork();
  }, []);

  const handleRegenerate = async () => {
    setLoading(true);
    const response = await BackendService.regenerateNeuralNetwork();
    if (response.success && response.data) {
      setNetwork(response.data);
    } else {
      setError(response.error || 'Failed to regenerate network');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading neural network...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.error}>{error}</Text>
        <Button mode="contained" onPress={loadNetwork} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Neural Network" />
        <Card.Content>
          <Text variant="bodyLarge" style={styles.infoText}>
            MyPal's brain consists of interconnected nodes representing concepts and their relationships.
          </Text>
          
          {network && (
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text variant="bodyLarge">Nodes:</Text>
                <Text variant="bodyLarge" style={styles.statValue}>
                  {network.nodes.length}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text variant="bodyLarge">Connections:</Text>
                <Text variant="bodyLarge" style={styles.statValue}>
                  {network.edges.length}
                </Text>
              </View>
            </View>
          )}

          <Text variant="bodyMedium" style={styles.noteText}>
            Note: Full 3D visualization will be available in a future update. For now, you can view the network structure on the desktop version.
          </Text>
        </Card.Content>
        <Card.Actions>
          <Button onPress={handleRegenerate}>Regenerate Network</Button>
        </Card.Actions>
      </Card>

      {network && network.nodes.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Recent Concepts" />
          <Card.Content>
            {network.nodes.slice(0, 10).map((node) => (
              <View key={node.id} style={styles.nodeItem}>
                <Text variant="bodyLarge">{node.label}</Text>
                <Text variant="bodySmall" style={styles.nodeGroup}>
                  {node.group}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}
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
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  infoText: {
    marginBottom: 16,
  },
  statsContainer: {
    marginVertical: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statValue: {
    fontWeight: 'bold',
  },
  noteText: {
    marginTop: 16,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  nodeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  nodeGroup: {
    opacity: 0.6,
  },
  loadingText: {
    marginTop: 16,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 16,
  },
});
