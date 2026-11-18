import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';

interface StatBoxProps {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
  highlightColor?: string;
}

export const StatBox: React.FC<StatBoxProps> = ({
  label,
  value,
  unit,
  highlight = false,
  highlightColor = Colors.primary,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, highlight && { color: highlightColor }]}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 70,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textPrimary,
  },
  unit: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginLeft: 3,
    fontWeight: Typography.fontWeight.medium,
  },
});

