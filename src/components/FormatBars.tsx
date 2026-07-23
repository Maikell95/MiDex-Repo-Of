import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GENS, type FormatInfo } from '../api/competitive';
import { colors } from '../theme';

// Dos filas de chips: generación (1-9) y formato de esa generación.
export default function FormatBars({
  gen,
  setGen,
  formats,
  format,
  setFormat,
}: {
  gen: number;
  setGen: (g: number) => void;
  formats: FormatInfo[];
  format: string | null;
  setFormat: (f: string) => void;
}) {
  return (
    <>
      <View style={styles.genBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {GENS.map((g) => {
            const active = g === gen;
            return (
              <Pressable
                key={g}
                style={[styles.genChip, active && styles.genChipActive]}
                onPress={() => setGen(g)}
              >
                <Text style={[styles.genChipText, active && styles.genChipTextActive]}>Gen {g}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.chipsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {formats.map((f) => {
            const active = f.id === format;
            return (
              <Pressable
                key={f.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFormat(f.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  genBar: { backgroundColor: colors.card },
  genChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  genChipText: { color: colors.textDim, fontWeight: '800', fontSize: 12 },
  genChipTextActive: { color: colors.bg },

  chipsBar: { borderBottomWidth: 1, borderColor: colors.border },
  chips: { paddingHorizontal: 10, paddingVertical: 9, gap: 8, alignItems: 'center' },
  chip: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#fff' },
});
