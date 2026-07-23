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
import { loadSpeciesList } from '../api/dex';
import PokeImage from '../components/PokeImage';
import ScreenBackground from '../components/ScreenBackground';
import TypeBadge from '../components/TypeBadge';
import type { TeamStackParamList } from '../navigation';
import { getTeam, upsertTeam } from '../team';
import { colors } from '../theme';
import type { DexEntry } from '../types';
import { dexNumber, spriteCandidates } from '../utils';

type Props = NativeStackScreenProps<TeamStackParamList, 'TeamPicker'>;
type Species = [string, DexEntry];

export default function TeamPickerScreen({ navigation, route }: Props) {
  const [species, setSpecies] = useState<Species[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSpeciesList()
      .then(setSpecies)
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

  const add = async (id: string, entry: DexEntry) => {
    const team = await getTeam(route.params.teamId);
    if (team && team.members.length < 6 && !team.members.some((m) => m.id === id)) {
      await upsertTeam({ ...team, members: [...team.members, { id, entry }] });
    }
    navigation.goBack();
  };

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <TextInput
        style={styles.search}
        placeholder="Buscar Pokémon…"
        placeholderTextColor={colors.textDim}
        value={query}
        onChangeText={setQuery}
        autoFocus
        autoCorrect={false}
      />
      <FlatList
        data={filtered}
        keyExtractor={([id]) => id}
        initialNumToRender={14}
        renderItem={({ item: [id, e] }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => add(id, e)}
          >
            <PokeImage sources={spriteCandidates(e)} style={styles.sprite} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{e.name}</Text>
              <Text style={styles.num}>{dexNumber(e.num)}</Text>
            </View>
            <View style={styles.types}>
              {e.types.map((t) => (
                <TypeBadge key={t} type={t} small />
              ))}
            </View>
          </Pressable>
        )}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border },
  rowPressed: { backgroundColor: colors.card },
  sprite: { width: 48, height: 48, marginRight: 10 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  num: { color: colors.textDim, fontSize: 11 },
  types: { alignItems: 'flex-end' },
});
