import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { loadGmaxList, type GmaxInfo } from '../api/gmax';
import { translateEs } from '../api/translate';
import PokeImage from '../components/PokeImage';
import TypeBadge from '../components/TypeBadge';
import { GMAX_INTRO, MAX_MOVES, POWER_INTRO, POWER_ROWS } from '../gmaxReference';
import { colors } from '../theme';
import { spriteCandidates } from '../utils';

interface Row extends GmaxInfo {
  desc: string;
}

function Reference() {
  return (
    <View>
      {/* Qué hace la Dinamax/Gigamax */}
      <Text style={styles.sectionTitle}>¿Qué hace la Dinamax?</Text>
      <Text style={styles.intro}>{GMAX_INTRO}</Text>

      {/* Cálculo de daño */}
      <Text style={styles.sectionTitle}>Cómo se calcula el daño</Text>
      <Text style={styles.intro}>{POWER_INTRO}</Text>
      <View style={styles.table}>
        <View style={[styles.trow, styles.thead]}>
          <Text style={[styles.tcell, styles.tbase, styles.th]}>Pot. base</Text>
          <Text style={[styles.tcell, styles.th]}>Max</Text>
          <Text style={[styles.tcell, styles.th]}>Lucha/Veneno</Text>
        </View>
        {POWER_ROWS.map((r) => (
          <View key={r.base} style={styles.trow}>
            <Text style={[styles.tcell, styles.tbase]}>{r.base}</Text>
            <Text style={styles.tcell}>{r.normal}</Text>
            <Text style={styles.tcell}>{r.fightpoison}</Text>
          </View>
        ))}
      </View>

      {/* Movimientos Max por tipo */}
      <Text style={styles.sectionTitle}>Movimientos Max por tipo</Text>
      {MAX_MOVES.map((m) => (
        <View key={m.type} style={styles.maxRow}>
          <TypeBadge type={m.type} small />
          <View style={styles.maxInfo}>
            <Text style={styles.maxName}>{m.name}</Text>
            <Text style={styles.maxEffect}>{m.effect}</Text>
          </View>
        </View>
      ))}
      <Text style={styles.maxNote}>
        Los de estado se convierten en Barrera Max (protege ese turno).
      </Text>

      {/* G-Max exclusivos */}
      <Text style={styles.sectionTitle}>Movimientos G-Max exclusivos</Text>
    </View>
  );
}

export default function GmaxScreen() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadGmaxList()
      .then(async (list) => {
        const translated = await Promise.all(
          list.map(async (g) => ({
            ...g,
            // Preferimos la descripción clara curada; si faltara, traducimos la de Showdown.
            desc: g.descEs ?? (g.descEn ? await translateEs(g.descEn) : ''),
          })),
        );
        if (!cancelled) setRows(translated);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.pokemon.toLowerCase().includes(q) ||
        r.moveName.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q),
    );
  }, [rows, query]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>No se pudieron cargar los datos Gigantamax.</Text>
      </View>
    );
  }
  if (!rows) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.dim}>Cargando Gigantamax…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Buscar Pokémon o movimiento G-Max…"
        placeholderTextColor={colors.textDim}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        initialNumToRender={8}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 12 }}
        ListHeaderComponent={query.trim() ? null : <Reference />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <PokeImage sources={spriteCandidates(item.entry)} style={styles.sprite} />
            <View style={styles.info}>
              <Text style={styles.pokemon}>{item.pokemon}</Text>
              <View style={styles.moveRow}>
                <Text style={styles.moveName}>{item.moveName}</Text>
                {item.moveType ? <TypeBadge type={item.moveType} small /> : null}
              </View>
              {item.desc ? <Text style={styles.desc}>{item.desc}</Text> : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dim: { color: colors.textDim, marginTop: 12, textAlign: 'center' },
  search: {
    backgroundColor: colors.card,
    color: colors.text,
    margin: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },

  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 18, marginBottom: 8 },
  intro: { color: colors.textDim, fontSize: 13, lineHeight: 19, marginBottom: 4 },

  table: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden', marginTop: 8, marginBottom: 4 },
  trow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border },
  thead: { backgroundColor: colors.cardAlt },
  tcell: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 7, paddingHorizontal: 8, textAlign: 'center' },
  tbase: { flex: 1.1, textAlign: 'left', color: colors.textDim },
  th: { fontWeight: '800' },

  maxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.border },
  maxInfo: { flex: 1 },
  maxName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  maxEffect: { color: colors.textDim, fontSize: 12, marginTop: 1 },
  maxNote: { color: colors.textDim, fontSize: 12, fontStyle: 'italic', marginTop: 8 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sprite: { width: 64, height: 64 },
  info: { flex: 1 },
  pokemon: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 1, flexWrap: 'wrap' },
  moveName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  desc: { color: colors.textDim, fontSize: 13, lineHeight: 18, marginTop: 4 },
});
