import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { getUsageRanking, type RankedMon } from '../api/competitive';
import FormatBars from '../components/FormatBars';
import PokeImage from '../components/PokeImage';
import ScreenBackground from '../components/ScreenBackground';
import type { CompetitiveStackParamList } from '../navigation';
import { colors } from '../theme';
import { useFormats } from '../useFormats';
import { dexNumber, spriteCandidates } from '../utils';

type Props = NativeStackScreenProps<CompetitiveStackParamList, 'Meta'>;

export default function CompetitiveListScreen({ navigation }: Props) {
  const { gen, setGen, formats, format, setFormat } = useFormats();
  const [ranking, setRanking] = useState<RankedMon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accesos a herramientas/referencias en la cabecera (solo iconos para que quepan).
  useLayoutEffect(() => {
    const btn = (icon: keyof typeof Ionicons.glyphMap, to: keyof CompetitiveStackParamList) => (
      <Pressable onPress={() => navigation.navigate(to as never)} hitSlop={8} style={styles.hBtn}>
        <Ionicons name={icon} size={20} color={colors.accent} />
      </Pressable>
    );
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerBtns}>
          {btn('calculator', 'DamageCalc')}
          {btn('speedometer', 'SpeedTiers')}
          {btn('bag-handle', 'Items')}
          {btn('resize', 'Gmax')}
          {btn('diamond', 'TeraTypes')}
        </View>
      ),
    });
  }, [navigation]);

  // Al cambiar de formato, cargamos el ranking de uso.
  useEffect(() => {
    if (!format) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getUsageRanking(format)
      .then((r) => !cancelled && setRanking(r))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [format]);

  const renderItem = useCallback(
    ({ item, index }: { item: RankedMon; index: number }) => (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() =>
          format && navigation.navigate('CompetitiveDetail', { name: item.name, format })
        }
      >
        <Text style={styles.rank}>{index + 1}</Text>
        {item.entry ? (
          <PokeImage sources={spriteCandidates(item.entry)} style={styles.sprite} />
        ) : (
          <View style={styles.sprite} />
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {item.entry ? <Text style={styles.num}>{dexNumber(item.entry.num)}</Text> : null}
        </View>
        <View style={styles.usageWrap}>
          <Text style={styles.usage}>{(item.usage * 100).toFixed(1)}%</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.min(100, item.usage * 100)}%` }]} />
          </View>
        </View>
      </Pressable>
    ),
    [navigation, format],
  );

  return (
    <ScreenBackground>
      <FormatBars gen={gen} setGen={setGen} formats={formats} format={format} setFormat={setFormat} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.dim}>Cargando metagame…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.dim}>No hay datos para este formato.</Text>
        </View>
      ) : (
        <FlatList
          data={ranking}
          keyExtractor={(item) => item.name}
          renderItem={renderItem}
          initialNumToRender={15}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListHeaderComponent={
            <Text style={styles.header}>Ranking de uso · {ranking.length} Pokémon</Text>
          }
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hBtn: { padding: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dim: { color: colors.textDim, marginTop: 12, textAlign: 'center' },
  header: { color: colors.textDim, fontSize: 12, fontWeight: '700', padding: 12, paddingBottom: 4 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border },
  rowPressed: { backgroundColor: colors.card },
  rank: { width: 30, color: colors.textDim, fontWeight: '800', fontSize: 14, textAlign: 'center' },
  sprite: { width: 52, height: 52, marginHorizontal: 6 },
  info: { flex: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  num: { color: colors.textDim, fontSize: 11, marginTop: 1 },
  usageWrap: { width: 96, alignItems: 'flex-end' },
  usage: { color: colors.text, fontSize: 14, fontWeight: '800' },
  barTrack: { width: 90, height: 6, borderRadius: 3, backgroundColor: colors.cardAlt, marginTop: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
});
