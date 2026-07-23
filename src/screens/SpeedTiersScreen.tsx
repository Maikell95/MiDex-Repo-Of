import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getUsageRanking, type RankedMon } from '../api/competitive';
import FormatBars from '../components/FormatBars';
import PokeImage from '../components/PokeImage';
import ScreenBackground from '../components/ScreenBackground';
import type { CompetitiveStackParamList } from '../navigation';
import { colors } from '../theme';
import { useFormats } from '../useFormats';
import { spriteCandidates } from '../utils';

type Props = NativeStackScreenProps<CompetitiveStackParamList, 'SpeedTiers'>;

const LEVELS = [50, 100];

// Estadística de Velocidad a un nivel dado. Máx = 252 EVs, IV 31, naturaleza +Vel (x1.1).
function maxSpeed(base: number, level: number): number {
  return Math.floor((Math.floor((2 * base + 94) * (level / 100)) + 5) * 1.1);
}
const scarfSpeed = (base: number, level: number) => Math.floor(maxSpeed(base, level) * 1.5);

interface SpeedMon extends RankedMon {
  base: number;
}

export default function SpeedTiersScreen({ navigation }: Props) {
  const { gen, setGen, formats, format, setFormat } = useFormats();
  const [mons, setMons] = useState<SpeedMon[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState(100);

  useEffect(() => {
    if (!format) return;
    let cancelled = false;
    setMons(null);
    setError(false);
    getUsageRanking(format)
      .then((list) => {
        if (cancelled) return;
        const withSpeed: SpeedMon[] = list
          .filter((m) => m.entry)
          .map((m) => ({ ...m, base: m.entry!.baseStats.spe }))
          .sort((a, b) => b.base - a.base);
        setMons(withSpeed);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [format]);

  const filtered = useMemo(() => {
    if (!mons) return [];
    const q = query.trim().toLowerCase();
    return q ? mons.filter((m) => m.name.toLowerCase().includes(q)) : mons;
  }, [mons, query]);

  return (
    <ScreenBackground>
      <FormatBars gen={gen} setGen={setGen} formats={formats} format={format} setFormat={setFormat} />

      <View style={styles.controls}>
        <TextInput
          style={styles.search}
          placeholder="Buscar Pokémon…"
          placeholderTextColor={colors.textDim}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        <View style={styles.levels}>
          {LEVELS.map((lv) => {
            const active = lv === level;
            return (
              <Pressable
                key={lv}
                style={[styles.lvChip, active && styles.lvChipActive]}
                onPress={() => setLevel(lv)}
              >
                <Text style={[styles.lvText, active && styles.lvTextActive]}>Nv {lv}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.dim}>No hay datos para este formato.</Text>
        </View>
      ) : !mons ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.dim}>Calculando velocidades…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.name}
          initialNumToRender={15}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListHeaderComponent={
            <Text style={styles.note}>
              Nivel {level} · Máx = 252 EVs + naturaleza (×1.1) · Scarf = ×1.5
            </Text>
          }
          ListEmptyComponent={
            <Text style={[styles.dim, { textAlign: 'center', marginTop: 30 }]}>Sin resultados.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() =>
                format && navigation.navigate('CompetitiveDetail', { name: item.name, format })
              }
            >
              {item.entry ? (
                <PokeImage sources={spriteCandidates(item.entry)} style={styles.sprite} />
              ) : (
                <View style={styles.sprite} />
              )}
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <View style={styles.stats}>
                <Text style={styles.base}>{item.base}</Text>
                <Text style={styles.sub}>
                  Máx {maxSpeed(item.base, level)} · Scarf {scarfSpeed(item.base, level)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dim: { color: colors.textDim, marginTop: 12, textAlign: 'center' },
  note: { color: colors.textDim, fontSize: 11, fontStyle: 'italic', padding: 12, paddingBottom: 6 },

  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  search: {
    flex: 1,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },
  levels: { flexDirection: 'row', gap: 6 },
  lvChip: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lvChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  lvText: { color: colors.textDim, fontWeight: '800', fontSize: 13 },
  lvTextActive: { color: '#fff' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.card },
  sprite: { width: 46, height: 46, marginRight: 8 },
  name: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  stats: { alignItems: 'flex-end' },
  base: { color: colors.accent, fontSize: 20, fontWeight: '900' },
  sub: { color: colors.textDim, fontSize: 11, marginTop: 1 },
});
