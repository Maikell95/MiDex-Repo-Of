import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { loadSpeciesList } from '../api/dex';
import PokemonCard from '../components/PokemonCard';
import ScreenBackground from '../components/ScreenBackground';
import type { RootStackParamList } from '../navigation';
import { colors } from '../theme';
import type { DexEntry } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Pokedex'>;
type Species = [string, DexEntry];

export default function PokedexListScreen({ navigation }: Props) {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadSpeciesList()
      .then(setSpecies)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return species;
    const isNum = /^\d+$/.test(q);
    return species.filter(([, e]) =>
      isNum ? String(e.num).includes(q) : e.name.toLowerCase().includes(q),
    );
  }, [species, query]);

  const handlePress = useCallback(
    (id: string, entry: DexEntry) => navigation.navigate('Detalle', { id, entry }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item: [id, e] }: { item: Species }) => (
      <PokemonCard id={id} entry={e} onPress={handlePress} />
    ),
    [handlePress],
  );

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.dim}>Cargando Pokédex (todas las generaciones)…</Text>
        </View>
      </ScreenBackground>
    );
  }

  if (error) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <Text style={styles.error}>No se pudo cargar la Pokédex.</Text>
          <Text style={styles.dim}>{error}</Text>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <TextInput
        style={styles.search}
        placeholder="Buscar por nombre o número…"
        placeholderTextColor={colors.textDim}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />
      <Text style={styles.tierNote}>
        Los tiers reflejan los últimos cambios del competitivo (Smogon/plataformas oficiales).
      </Text>
      <FlatList
        data={filtered}
        keyExtractor={([id]) => id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.column}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={[styles.dim, { textAlign: 'center', marginTop: 40 }]}>
            Sin resultados para “{query}”.
          </Text>
        }
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dim: { color: colors.textDim, marginTop: 12, textAlign: 'center' },
  error: { color: colors.accent, fontWeight: '700', fontSize: 16 },
  search: {
    backgroundColor: colors.card,
    color: colors.text,
    margin: 12,
    marginBottom: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },
  tierNote: { color: colors.textDim, fontSize: 11, paddingHorizontal: 16, paddingBottom: 8, fontStyle: 'italic' },
  list: { padding: 8 },
  column: { gap: 10, paddingHorizontal: 4 },
});
