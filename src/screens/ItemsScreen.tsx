import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ITEM_COLS,
  ITEM_ICON,
  ITEM_SHEET,
  ITEM_SHEET_H,
  ITEM_SHEET_W,
  itemSpriteUrl,
  loadCompetitiveItems,
  type ItemGroup,
  type ItemInfo,
} from '../api/items';
import { colors } from '../theme';

const ICON_SIZE = 30;

// Icono del objeto: 1) hoja de Showdown por spritenum; 2) sprite de PokéAPI; 3) placeholder.
function ItemIcon({ item }: { item: ItemInfo }) {
  const [err, setErr] = useState(false);

  if (item.spritenum != null) {
    const scale = ICON_SIZE / ITEM_ICON;
    const col = item.spritenum % ITEM_COLS;
    const row = Math.floor(item.spritenum / ITEM_COLS);
    return (
      <View style={styles.icon}>
        <Image
          source={{ uri: ITEM_SHEET }}
          style={{
            position: 'absolute',
            width: ITEM_SHEET_W * scale,
            height: ITEM_SHEET_H * scale,
            left: -(col * ITEM_ICON * scale),
            top: -(row * ITEM_ICON * scale),
          }}
          resizeMode="stretch"
        />
      </View>
    );
  }
  if (!err) {
    return (
      <Image
        source={{ uri: itemSpriteUrl(item.slug) }}
        style={styles.icon}
        resizeMode="contain"
        onError={() => setErr(true)}
      />
    );
  }
  return <View style={[styles.icon, styles.iconPh]} />;
}

export default function ItemsScreen() {
  const [groups, setGroups] = useState<ItemGroup[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string | null>(null); // null = todas

  useEffect(() => {
    loadCompetitiveItems().then(setGroups).catch(() => setError(true));
  }, []);

  const sections = useMemo(() => {
    if (!groups) return [];
    const q = query.trim().toLowerCase();
    return groups
      .filter((g) => !cat || g.label === cat)
      .map((g) => ({
        title: g.label,
        data: q
          ? g.items.filter((i) => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q))
          : g.items,
      }))
      .filter((s) => s.data.length);
  }, [groups, query, cat]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>No se pudieron cargar los objetos.</Text>
      </View>
    );
  }
  if (!groups) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.dim}>Cargando objetos…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Buscar objeto…"
        placeholderTextColor={colors.textDim}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      {/* Filtro por categoría */}
      <View style={styles.chipsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Todas" active={cat === null} onPress={() => setCat(null)} />
          {groups.map((g) => (
            <Chip key={g.label} label={g.short} active={cat === g.label} onPress={() => setCat(g.label)} />
          ))}
        </ScrollView>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, i) => item.slug + i}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <ItemIcon item={item} />
            <View style={styles.itemText}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={[styles.dim, { textAlign: 'center', marginTop: 30 }]}>Sin resultados.</Text>}
      />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dim: { color: colors.textDim, marginTop: 12, textAlign: 'center' },
  search: {
    backgroundColor: colors.card,
    color: colors.text,
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },

  chipsBar: { borderBottomWidth: 1, borderColor: colors.border },
  chips: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
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

  sectionHeader: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border, gap: 12 },
  icon: { width: ICON_SIZE, height: ICON_SIZE, overflow: 'hidden' },
  iconPh: { backgroundColor: colors.cardAlt, borderRadius: 6 },
  itemText: { flex: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  desc: { color: colors.textDim, fontSize: 13, lineHeight: 18, marginTop: 2 },
});
