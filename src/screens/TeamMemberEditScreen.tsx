import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getCompetitive, type CompSet } from '../api/competitive';
import { getLearnedMoves } from '../api/dex';
import { loadItemIndex, resolveItem, type ItemIndex } from '../api/itemIndex';
import BottomSheet from '../components/BottomSheet';
import ItemIcon from '../components/ItemIcon';
import PokeImage from '../components/PokeImage';
import ScreenBackground from '../components/ScreenBackground';
import TypeBadge from '../components/TypeBadge';
import TypeCircle from '../components/TypeCircle';
import { loadCompetitiveLocale, typeEs, type CompLocale } from '../localize';
import type { TeamStackParamList } from '../navigation';
import { calcStat, natureEs, NATURES } from '../natures';
import { defaultSet, getTeam, HAZARD_REMOVAL_IDS, HAZARD_SETTER_IDS, upsertTeam, type MemberSet, type MoveRef, type SavedTeam } from '../team';
import { colors, typeColor } from '../theme';
import type { LearnedMove, StatKey } from '../types';
import { ALL_TYPES } from '../typeChart';
import { abilityList, spriteCandidates, STAT_ORDER, toId } from '../utils';

type Props = NativeStackScreenProps<TeamStackParamList, 'TeamMemberEdit'>;

const SHORT: Record<string, string> = { hp: 'PS', atk: 'Atk', def: 'Def', spa: 'AtEsp', spd: 'DefEsp', spe: 'Vel' };
// Tipos posibles del Poder Oculto (todos menos Normal y Hada). Orden ajustado para que la
// cuadrícula quede simétrica (Lucha va en penúltimo lugar).
const HP_TYPES = ['flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'fighting', 'dark'];
const arr = (x?: string | string[]) => (Array.isArray(x) ? x : x ? [x] : []);
const clamp = (n: number, max: number) => Math.max(0, Math.min(max, isNaN(n) ? 0 : n));

export default function TeamMemberEditScreen({ route }: Props) {
  const { teamId, memberId } = route.params;
  const [team, setTeam] = useState<SavedTeam | null>(null);
  const [set, setSet] = useState<MemberSet>(defaultSet());
  const [learned, setLearned] = useState<LearnedMove[]>([]);
  const [loc, setLoc] = useState<CompLocale | null>(null);
  const [recommended, setRecommended] = useState<CompSet | undefined>();
  const [statMoves, setStatMoves] = useState<string[]>([]); // movs por uso, para rellenar huecos
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const [moveQuery, setMoveQuery] = useState('');
  const [itemIdx, setItemIdx] = useState<ItemIndex | null>(null); // índice de objetos (icono + lista)
  const [pickingItem, setPickingItem] = useState(false);
  const [itemQuery, setItemQuery] = useState('');

  const member = team?.members.find((m) => m.id === memberId);

  useEffect(() => {
    getTeam(teamId).then((t) => {
      if (!t) return;
      setTeam(t);
      const m = t.members.find((x) => x.id === memberId);
      if (!m) return;
      setSet(m.set ?? defaultSet());
      getLearnedMoves(m.id, m.entry).then(setLearned);
      loadCompetitiveLocale().then(setLoc);
      getCompetitive(m.entry.name, t.format).then((c) => {
        setRecommended(c.sets ? Object.values(c.sets)[0] : undefined);
        setStatMoves(Object.entries(c.stat?.moves ?? {}).sort((a, b) => b[1] - a[1]).map(([n]) => n));
      });
    });
    loadItemIndex().then(setItemIdx).catch(() => {});
  }, [teamId, memberId]);

  const update = (next: MemberSet) => {
    setSet(next);
    if (team) {
      const nt = { ...team, members: team.members.map((m) => (m.id === memberId ? { ...m, set: next } : m)) };
      setTeam(nt);
      upsertTeam(nt);
    }
  };

  const evTotal = STAT_ORDER.reduce((s, k) => s + (set.evs[k] ?? 0), 0);

  // Convierte un nombre de movimiento a MoveRef. Detecta el Poder Oculto y su tipo
  // (p. ej. "Hidden Power Fire" -> Poder Oculto tipo Fuego).
  const toMoveRef = (name: string): MoveRef => {
    if (/^hidden\s*power/i.test(name)) {
      const t = name.replace(/^hidden\s*power/i, '').trim().toLowerCase();
      return { id: 'hiddenpower', name: t ? `Poder Oculto (${typeEs(t)})` : 'Poder Oculto', type: t };
    }
    const lm = learned.find((l) => l.id === toId(name));
    return lm ? { id: lm.id, name: lm.nameEs, type: lm.move.type } : { id: toId(name), name, type: '' };
  };

  const applyRecommended = () => {
    if (!recommended) return;

    // Control de campo ya presente en OTROS miembros del equipo.
    //  - Trampas: se comparan por movimiento exacto (dos Pokémon pueden poner trampas
    //    distintas —Trampa Rocas + Púas + Red Viscosa—, lo que no se repite es la MISMA).
    //  - Limpieza: basta con un limpiador en el equipo; no se añade un segundo.
    const takenSetters = new Set<string>();
    let hasRemoval = false;
    for (const mm of team?.members ?? []) {
      if (mm.id === memberId) continue;
      for (const mv of mm.set?.moves ?? []) {
        if (!mv) continue;
        if (HAZARD_SETTER_IDS.has(mv.id)) takenSetters.add(mv.id);
        if (HAZARD_REMOVAL_IDS.has(mv.id)) hasRemoval = true;
      }
    }

    const chosen: MoveRef[] = [];
    const used = new Set<string>();
    const tryAdd = (name: string): boolean => {
      const ref = toMoveRef(name);
      const id = ref.id;
      if (used.has(id)) return false;
      if (HAZARD_SETTER_IDS.has(id) && takenSetters.has(id)) return false; // esa trampa ya está en el equipo
      if (HAZARD_REMOVAL_IDS.has(id) && hasRemoval) return false; // ya hay un limpiador
      chosen.push(ref);
      used.add(id);
      if (HAZARD_SETTER_IDS.has(id)) takenSetters.add(id);
      if (HAZARD_REMOVAL_IDS.has(id)) hasRemoval = true;
      return true;
    };

    // Movs del set recomendado (probando alternativas de cada hueco si el primero se descarta).
    for (const slot of recommended.moves) {
      if (chosen.length >= 4) break;
      for (const name of arr(slot)) if (tryAdd(name)) break;
    }
    // Relleno con los movs más usados si se descartó algún duplicado de control de campo.
    for (const name of statMoves) {
      if (chosen.length >= 4) break;
      const low = name.toLowerCase();
      if (low === 'nothing' || low === 'other') continue;
      tryAdd(name);
    }

    update({
      ...set,
      moves: [chosen[0] ?? null, chosen[1] ?? null, chosen[2] ?? null, chosen[3] ?? null],
      ability: arr(recommended.ability)[0],
      item: arr(recommended.item)[0],
      nature: arr(recommended.nature)[0] ?? set.nature,
      tera: arr(recommended.teratypes)[0],
      evs: (recommended.evs ?? {}) as Partial<Record<StatKey, number>>,
    });
  };

  const filteredMoves = useMemo(() => {
    const q = moveQuery.trim().toLowerCase();
    return q ? learned.filter((l) => l.nameEs.toLowerCase().includes(q)) : learned;
  }, [learned, moveQuery]);

  const filteredItems = useMemo(() => {
    const list = itemIdx?.list ?? [];
    const q = itemQuery.trim().toLowerCase();
    return q ? list.filter((i) => i.es.toLowerCase().includes(q) || i.slug.includes(q)) : list;
  }, [itemIdx, itemQuery]);

  if (!member || !loc) {
    return (
      <ScreenBackground>
        <View style={styles.center}><Text style={styles.dim}>Cargando…</Text></View>
      </ScreenBackground>
    );
  }
  const L = loc;
  const entry = member.entry;
  const level = team?.level ?? 100;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        {/* Cabecera */}
        <View style={styles.head}>
          <PokeImage sources={spriteCandidates(entry)} style={styles.sprite} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{entry.name}</Text>
            <View style={styles.types}>
              {entry.types.map((t) => <TypeBadge key={t} type={t} small />)}
              {set.tera ? <TypeBadge type={set.tera} small tera /> : null}
            </View>
            <Text style={styles.lvNote}>Nivel del equipo: {level}</Text>
          </View>
        </View>

        {recommended ? (
          <Pressable style={styles.recBtn} onPress={applyRecommended}>
            <Ionicons name="sparkles" size={15} color="#fff" />
            <Text style={styles.recText}>Usar set recomendado</Text>
          </Pressable>
        ) : null}

        {/* Movimientos */}
        <Text style={styles.section}>Movimientos</Text>
        {[0, 1, 2, 3].map((i) => {
          const mv = set.moves[i];
          const isHP = mv?.id === 'hiddenpower';
          return (
            <View key={i}>
              <Pressable style={styles.moveRow} onPress={() => { setMoveQuery(''); setPickSlot(i); }}>
                {mv ? (
                  <>
                    {mv.type ? <View style={[styles.dot, { backgroundColor: typeColor(mv.type) }]} /> : null}
                    <Text style={styles.moveName}>{mv.name}</Text>
                    <Ionicons name="pencil" size={15} color={colors.textDim} />
                  </>
                ) : (
                  <Text style={styles.moveEmpty}>+ Elegir movimiento {i + 1}</Text>
                )}
              </Pressable>
              {isHP ? (
                <View style={styles.hpTypes}>
                  {HP_TYPES.map((t) => (
                    <TypeCircle
                      key={t}
                      type={t}
                      size={30}
                      active={mv!.type.toLowerCase() === t}
                      onPress={() => {
                        const moves = [...set.moves];
                        moves[i] = { id: 'hiddenpower', name: `Poder Oculto (${typeEs(t)})`, type: t };
                        update({ ...set, moves });
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}

        {/* Stats + EVs + IVs */}
        <Text style={styles.section}>Estadísticas (EVs / IVs) · Total EVs: {evTotal}/508</Text>
        <View style={styles.statHead}>
          <Text style={[styles.sCell, styles.sLbl]}>Stat</Text>
          <Text style={styles.sCell}>Base</Text>
          <Text style={styles.sCell}>EV</Text>
          <Text style={styles.sCell}>IV</Text>
          <Text style={[styles.sCell, styles.sFinal]}>Total</Text>
        </View>
        {STAT_ORDER.map((k) => {
          const base = entry.baseStats[k];
          const ev = set.evs[k] ?? 0;
          const iv = set.ivs[k] ?? 31;
          const total = calcStat(k, base, ev, level, set.nature, iv);
          return (
            <View key={k} style={styles.statRow}>
              <Text style={[styles.sCell, styles.sLbl]}>{SHORT[k]}</Text>
              <Text style={styles.sCell}>{base}</Text>
              <TextInput
                style={[styles.sCell, styles.sInput]}
                keyboardType="number-pad"
                value={String(ev)}
                onChangeText={(t) => update({ ...set, evs: { ...set.evs, [k]: clamp(parseInt(t, 10), 252) } })}
              />
              <TextInput
                style={[styles.sCell, styles.sInput]}
                keyboardType="number-pad"
                value={String(iv)}
                onChangeText={(t) => update({ ...set, ivs: { ...set.ivs, [k]: clamp(parseInt(t, 10), 31) } })}
              />
              <Text style={[styles.sCell, styles.sFinal]}>{total}</Text>
            </View>
          );
        })}
        {evTotal > 508 ? <Text style={styles.warn}>⚠ Te has pasado del máximo de 508 EVs.</Text> : null}

        {/* Naturaleza */}
        <Text style={styles.section}>Naturaleza</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {NATURES.map((n) => {
            const on = set.nature === n.name;
            const mod = n.plus ? `+${SHORT[n.plus]}/-${SHORT[n.minus!]}` : '=';
            return (
              <Pressable key={n.name} style={[styles.chip, on && styles.chipOn]} onPress={() => update({ ...set, nature: n.name })}>
                <Text style={[styles.chipT, on && styles.chipTOn]}>{n.es}</Text>
                <Text style={[styles.chipSub, on && styles.chipTOn]}>{mod}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Habilidad */}
        <Text style={styles.section}>Habilidad</Text>
        <View style={styles.wrap}>
          {abilityList(entry).map(({ name }) => {
            const on = set.ability === name;
            return (
              <Pressable key={name} style={[styles.chip, on && styles.chipOn]} onPress={() => update({ ...set, ability: name })}>
                <Text style={[styles.chipT, on && styles.chipTOn]}>{L.ability(name)}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Teratipo */}
        <Text style={styles.section}>
          Teratipo{set.tera ? `: ${typeEs(set.tera)}` : ''}
        </Text>
        <View style={styles.teraWrap}>
          {ALL_TYPES.map((t) => (
            <TypeCircle
              key={t}
              type={t}
              active={set.tera === t}
              onPress={() => update({ ...set, tera: set.tera === t ? undefined : t })}
            />
          ))}
        </View>

        {/* Objeto: selector completo con buscador e icono (como en la calculadora) */}
        <Text style={styles.section}>Objeto</Text>
        {(() => {
          const sel = resolveItem(itemIdx, set.item);
          return (
            <Pressable style={styles.itemBtn} onPress={() => { setItemQuery(''); setPickingItem(true); }}>
              {set.item ? (
                <>
                  {sel ? <ItemIcon spritenum={sel.spritenum} slug={sel.slug} size={26} /> : null}
                  <Text style={styles.itemName} numberOfLines={1}>{sel?.es ?? L.item(set.item)}</Text>
                </>
              ) : (
                <Text style={styles.itemEmpty}>+ Elegir objeto</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} style={{ marginLeft: 'auto' }} />
            </Pressable>
          );
        })()}
      </ScrollView>

      {/* Hoja selector de movimiento */}
      <BottomSheet visible={pickSlot !== null} onClose={() => setPickSlot(null)}>
        {(scroll) => (
          <>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Movimiento {pickSlot !== null ? pickSlot + 1 : ''}</Text>
              <Pressable onPress={() => setPickSlot(null)} hitSlop={10}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Buscar movimiento…"
              placeholderTextColor={colors.textDim}
              value={moveQuery}
              onChangeText={setMoveQuery}
            />
            <FlatList
              data={filteredMoves}
              keyExtractor={(m) => m.id}
              initialNumToRender={20}
              keyboardShouldPersistTaps="handled"
              {...scroll}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.mvOpt}
                  onPress={() => {
                    const moves = [...set.moves];
                    moves[pickSlot!] = { id: item.id, name: item.nameEs, type: item.move.type };
                    update({ ...set, moves });
                    setPickSlot(null);
                  }}
                >
                  <View style={[styles.dot, { backgroundColor: typeColor(item.move.type) }]} />
                  <Text style={styles.mvOptName}>{item.nameEs}</Text>
                  <Text style={styles.mvOptType}>{typeEs(item.move.type)}</Text>
                </Pressable>
              )}
            />
          </>
        )}
      </BottomSheet>

      {/* Hoja selector de objeto (buscador + icono) */}
      <BottomSheet visible={pickingItem} onClose={() => setPickingItem(false)}>
        {(scroll) => (
          <>
            <TextInput
              style={styles.modalSearch}
              placeholder="Buscar objeto…"
              placeholderTextColor={colors.textDim}
              value={itemQuery}
              onChangeText={setItemQuery}
            />
            <FlatList
              data={filteredItems}
              keyExtractor={(it) => it.slug}
              initialNumToRender={16}
              keyboardShouldPersistTaps="handled"
              {...scroll}
              ListHeaderComponent={
                <Pressable style={styles.itemOpt} onPress={() => { update({ ...set, item: undefined }); setPickingItem(false); }}>
                  <View style={styles.itemIconPh} />
                  <Text style={styles.mvOptName}>Ninguno</Text>
                </Pressable>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.itemOpt} onPress={() => { update({ ...set, item: item.es }); setPickingItem(false); }}>
                  <ItemIcon spritenum={item.spritenum} slug={item.slug} size={30} />
                  <Text style={styles.mvOptName}>{item.es}</Text>
                </Pressable>
              )}
            />
          </>
        )}
      </BottomSheet>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dim: { color: colors.textDim },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sprite: { width: 72, height: 72 },
  name: { color: colors.text, fontSize: 20, fontWeight: '900' },
  types: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 },
  teraSep: { marginHorizontal: 3 },
  lvNote: { color: colors.textDim, fontSize: 11, marginTop: 3, fontStyle: 'italic' },

  recBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 10, marginTop: 12 },
  recText: { color: '#fff', fontWeight: '800' },

  section: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 20, marginBottom: 8 },
  itemBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10 },
  itemName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  itemEmpty: { color: colors.textDim, fontSize: 14, fontWeight: '700' },
  itemOpt: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: colors.border },
  itemIconPh: { width: 30, height: 30, borderRadius: 6, backgroundColor: colors.cardAlt },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  moveName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  moveEmpty: { color: colors.textDim, fontSize: 14 },
  hpTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8, paddingHorizontal: 4 },

  statHead: { flexDirection: 'row', paddingBottom: 4, borderBottomWidth: 1, borderColor: colors.border },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  sCell: { flex: 1, color: colors.text, fontSize: 13, textAlign: 'center' },
  sLbl: { color: colors.textDim, fontWeight: '800', textAlign: 'left' },
  sInput: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 4, marginHorizontal: 3, color: colors.text },
  sFinal: { color: colors.accent, fontWeight: '900' },
  warn: { color: colors.accent, fontSize: 12, marginTop: 6 },

  chips: { gap: 6, paddingRight: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipT: { color: colors.text, fontWeight: '700', fontSize: 12 },
  chipSub: { color: colors.textDim, fontSize: 9 },
  chipTOn: { color: '#fff' },
  teraWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  modalSearch: { backgroundColor: colors.card, color: colors.text, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  mvOpt: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border },
  mvOptName: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  mvOptType: { color: colors.textDim, fontSize: 12 },
});
