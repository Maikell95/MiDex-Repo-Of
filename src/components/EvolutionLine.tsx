import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EvoNode } from '../api/dex';
import { colors, typeColor } from '../theme';
import type { DexEntry } from '../types';
import { spriteCandidates } from '../utils';
import PokeImage from './PokeImage';

// Usa la MISMA imagen que las tarjetas de la lista (sprite frontal -> artwork),
// más grande, para rellenar mejor las cajas de la línea evolutiva.
function MiniSprite({ entry }: { entry: DexEntry }) {
  return <PokeImage sources={spriteCandidates(entry)} style={styles.icon} />;
}

export default function EvolutionLine({
  stages,
  currentId,
  onSelect,
}: {
  stages: EvoNode[][];
  currentId: string;
  onSelect: (id: string, entry: DexEntry) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {stages.map((layer, i) => (
        <View key={i} style={styles.stageRow}>
          {i > 0 && <Text style={styles.arrow}>›</Text>}
          <View style={styles.stage}>
            {layer.map((node) => {
              const active = node.id === currentId;
              return (
                <Pressable
                  key={node.id}
                  style={({ pressed }) => [
                    styles.card,
                    active && { borderColor: typeColor(node.entry.types[0]) },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => onSelect(node.id, node.entry)}
                  disabled={active}
                >
                  <MiniSprite entry={node.entry} />
                  <Text style={[styles.name, active && styles.nameActive]} numberOfLines={1}>
                    {node.entry.name}
                  </Text>
                  {node.method ? (
                    <Text style={styles.method} numberOfLines={2}>
                      {node.method}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', justifyContent: 'center', flexGrow: 1, paddingVertical: 4, paddingHorizontal: 8 },
  stageRow: { flexDirection: 'row', alignItems: 'center' },
  arrow: { color: colors.textDim, fontSize: 22, marginHorizontal: 2 },
  stage: { justifyContent: 'center' },
  card: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginVertical: 4,
    width: 96,
    height: 138, // altura fija: los sprites quedan alineados aunque el método ocupe 1 o 2 líneas
  },
  cardPressed: { opacity: 0.6, transform: [{ scale: 0.96 }] },
  icon: { width: 78, height: 78 },
  name: { color: colors.text, fontSize: 11, fontWeight: '700', maxWidth: 88, textAlign: 'center' },
  nameActive: { color: colors.accent, fontWeight: '800' },
  method: { color: colors.textDim, fontSize: 9, textAlign: 'center', marginTop: 2, lineHeight: 12 },
});
