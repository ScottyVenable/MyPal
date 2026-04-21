import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Circle, G, Text as SvgText } from 'react-native-svg';
import { getRegionColor } from '@/utils/helpers';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface NeuralRegionViewProps {
  regionId: string;
  name: string;
  neuronCount: number;
  cx: number;
  cy: number;
  isActive: boolean;
  onPress?: () => void;
}

export function NeuralRegionView({
  regionId,
  name,
  neuronCount,
  cx,
  cy,
  isActive,
}: NeuralRegionViewProps): React.JSX.Element {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const baseRadius = Math.max(20, Math.min(45, neuronCount * 2));
  const color = getRegionColor(regionId);

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ]),
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [isActive, glowAnim]);

  const glowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [baseRadius, baseRadius + 8],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  // Truncate long region names for SVG display
  const displayName =
    name.length > 12 ? name.slice(0, 10) + '..' : name;

  return (
    <G>
      {/* Glow effect */}
      {isActive && (
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={glowRadius}
          fill={color}
          opacity={glowOpacity}
        />
      )}
      {/* Main circle */}
      <Circle
        cx={cx}
        cy={cy}
        r={baseRadius}
        fill={color}
        opacity={0.8}
        stroke={isActive ? '#FFFFFF' : color}
        strokeWidth={isActive ? 2 : 1}
      />
      {/* Region label */}
      <SvgText
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={10}
        fontWeight="bold"
      >
        {displayName}
      </SvgText>
      {/* Neuron count */}
      <SvgText
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={9}
        opacity={0.8}
      >
        {neuronCount}
      </SvgText>
    </G>
  );
}
