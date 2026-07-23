import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import TypeBadge from '../components/TypeBadge';
import { TERA, TERA_INTRO, TERA_ORDER } from '../teraChart';
import { colors, typeColor } from '../theme';

function Relation({ label, types }: { label: string; types: string[] }) {
  return (
    <View style={styles.relRow}>
      <Text style={styles.relLabel}>{label}</Text>
      <View style={styles.relTypes}>
        {types.length ? (
          types.map((t) => <TypeBadge key={t} type={t} small />)
        ) : (
          <Text style={styles.none}>—</Text>
        )}
      </View>
    </View>
  );
}

export default function TeraTypesScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.intro}>{TERA_INTRO}</Text>
      {TERA_ORDER.map((t) => {
        const p = TERA[t];
        if (!p) return null;
        return (
          <View key={t} style={[styles.card, { borderLeftColor: typeColor(t) }]}>
            <View style={styles.head}>
              <TypeBadge type={t} />
            </View>
            <Text style={styles.note}>{p.note}</Text>
            <Relation label="Supereficaz" types={p.se} />
            <Relation label="Débil a" types={p.weak} />
            <Relation label="Resiste" types={p.res} />
            <Relation label="Inmune a" types={p.immTo} />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  intro: { color: colors.textDim, fontSize: 13, lineHeight: 20, padding: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.border,
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 12,
  },
  head: { flexDirection: 'row', marginBottom: 6 },
  note: { color: colors.text, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  relRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  relLabel: { width: 88, color: colors.textDim, fontSize: 12, fontWeight: '700', paddingTop: 5 },
  relTypes: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  none: { color: colors.textDim, fontSize: 13, paddingTop: 3 },
});
