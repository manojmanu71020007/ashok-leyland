import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function BatteryBar({ soc, isCharging, showText = true, size = 'md' }) {
  const percentage = Math.max(0, Math.min(100, Number(soc) || 0));
  const color = colors.getSocColor(percentage);

  const height = size === 'sm' ? 6 : size === 'lg' ? 12 : 8;

  return (
    <View style={styles.container}>
      <View style={[styles.barTrack, { height }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${percentage}%`,
              backgroundColor: isCharging ? colors.purple : color,
            },
          ]}
        />
      </View>
      {showText && (
        <View style={styles.textRow}>
          <Text style={[styles.socText, { color: isCharging ? colors.purple : color }]}>
            {isCharging ? '⚡ ' : '🔋 '}
            {percentage}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  barTrack: {
    width: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  socText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
