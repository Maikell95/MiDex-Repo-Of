import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tierColor } from '../theme';

export default function TierBadge({ tier }: { tier?: string }) {
  if (!tier || tier === 'Illegal') return null;
  return (
    <View style={[styles.badge, { borderColor: tierColor(tier) }]}>
      <Text style={[styles.text, { color: tierColor(tier) }]}>{tier}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  text: { fontWeight: '800', fontSize: 11 },
});
