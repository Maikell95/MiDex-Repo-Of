import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, statColor, statLabels } from '../theme';

const MAX_STAT = 255; // máximo teórico de un stat base

export default function StatBar({ statKey, value }: { statKey: string; value: number }) {
  const pct = Math.min(100, (value / MAX_STAT) * 100);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{statLabels[statKey] ?? statKey}</Text>
      <Text style={styles.value}>{value}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: statColor(value) }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  label: { width: 74, color: colors.textDim, fontSize: 13 },
  value: { width: 38, color: colors.text, fontSize: 13, fontWeight: '700', textAlign: 'right', marginRight: 10 },
  track: { flex: 1, height: 9, borderRadius: 5, backgroundColor: colors.cardAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
