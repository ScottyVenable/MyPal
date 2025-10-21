import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import {
  Card,
  Text,
  ActivityIndicator,
  Chip,
  useTheme,
} from 'react-native-paper';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import apiClient from '../services/api';
import websocketService from '../services/websocket';
import { NeuralEvent } from '../types';

interface BrainRegion {
  name: string;
  neurons: number;
  x: number;
  y: number;
}

export default function BrainScreen() {
  const theme = useTheme();
  const [brainData, setBrainData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeNeurons, setActiveNeurons] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadBrainData();
    setupWebSocket();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  const loadBrainData = async () => {
    try {
      const response = await apiClient.getBrainData();
      setBrainData(response);
    } catch (error) {
      console.error('Failed to load brain data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    websocketService.connect();
    websocketService.onNeuralEvent((event: NeuralEvent) => {
      if (event.type === 'fire' && event.neuronId) {
        setActiveNeurons(prev => {
          const next = new Set(prev);
          next.add(event.neuronId);
          return next;
        });

        // Clear after animation
        setTimeout(() => {
          setActiveNeurons(prev => {
            const next = new Set(prev);
            next.delete(event.neuronId);
            return next;
          });
        }, 500);
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading brain data...</Text>
      </View>
    );
  }

  if (!brainData) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="titleLarge">No brain data available</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const svgWidth = screenWidth - 32;
  const svgHeight = 300;

  // Define brain regions layout
  const regions: BrainRegion[] = [
    { name: 'Language', neurons: brainData.regions?.language || 0, x: svgWidth * 0.2, y: svgHeight * 0.3 },
    { name: 'Memory', neurons: brainData.regions?.memory || 0, x: svgWidth * 0.5, y: svgHeight * 0.2 },
    { name: 'Emotion', neurons: brainData.regions?.emotion || 0, x: svgWidth * 0.8, y: svgHeight * 0.3 },
    { name: 'Logic', neurons: brainData.regions?.logic || 0, x: svgWidth * 0.35, y: svgHeight * 0.6 },
    { name: 'Social', neurons: brainData.regions?.social || 0, x: svgWidth * 0.65, y: svgHeight * 0.6 },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Neural Network Visualization
          </Text>
          <Svg width={svgWidth} height={svgHeight}>
            {/* Draw connections between regions */}
            {regions.map((from, i) =>
              regions.slice(i + 1).map((to, j) => (
                <Line
                  key={`${i}-${j}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={theme.colors.outline}
                  strokeWidth={1}
                  opacity={0.3}
                />
              ))
            )}

            {/* Draw region nodes */}
            {regions.map((region, i) => {
              const radius = Math.min(30 + region.neurons / 10, 50);
              const isActive = activeNeurons.size > 0; // Simplified activation

              return (
                <React.Fragment key={i}>
                  <Circle
                    cx={region.x}
                    cy={region.y}
                    r={radius}
                    fill={isActive ? theme.colors.primary : theme.colors.surfaceVariant}
                    opacity={isActive ? 0.8 : 0.6}
                  />
                  <SvgText
                    x={region.x}
                    y={region.y + 5}
                    fontSize={12}
                    fill={theme.colors.onSurface}
                    textAnchor="middle"
                  >
                    {region.name}
                  </SvgText>
                  <SvgText
                    x={region.x}
                    y={region.y + 20}
                    fontSize={10}
                    fill={theme.colors.onSurface}
                    textAnchor="middle"
                  >
                    {region.neurons}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Network Statistics
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium">{brainData.totalNeurons || 0}</Text>
              <Text variant="bodySmall">Total Neurons</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium">{brainData.totalConnections || 0}</Text>
              <Text variant="bodySmall">Connections</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium">{brainData.activationRate || 0}%</Text>
              <Text variant="bodySmall">Activation Rate</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Active Regions
          </Text>
          <View style={styles.chipsContainer}>
            {regions.map((region, i) => (
              <Chip
                key={i}
                icon="brain"
                style={styles.chip}
                selected={activeNeurons.size > 0}
              >
                {region.name} ({region.neurons})
              </Chip>
            ))}
          </View>
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
});
