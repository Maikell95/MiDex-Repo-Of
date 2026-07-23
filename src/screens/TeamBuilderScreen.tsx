import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  autoTeam,
  getFormatsForGen,
  getUsageRanking,
  loadEntryResolver,
  type FormatInfo,
  type RankedMon,
} from '../api/competitive';
import { getMovePool } from '../api/dex';
import FormatBars from '../components/FormatBars';
import PokeImage from '../components/PokeImage';
import ScreenBackground from '../components/ScreenBackground';
import TypeBadge from '../components/TypeBadge';
import { calcStat, natureEs } from '../natures';
import type { TeamStackParamList } from '../navigation';
import { getTeam, HAZARD_REMOVAL, HAZARD_SETTERS, upsertTeam, type SavedTeam, type TeamMember } from '../team';
import { colors } from '../theme';
import type { StatKey } from '../types';
import { teamTypeAnalysis } from '../typeChart';
import { spriteCandidates, STAT_ORDER } from '../utils';

type Props = NativeStackScreenProps<TeamStackParamList, 'TeamEdit'>;
const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const STAT_SHORT: Record<string, string> = { hp: 'PS', atk: 'Atk', def: 'Def', spa: 'AtS', spd: 'DefS', spe: 'Vel' };

export default function TeamBuilderScreen({ route, navigation }: Props) {
  const { teamId } = route.params;
  const [team, setTeam] = useState<SavedTeam | null>(null);
  const [formats, setFormats] = useState<FormatInfo[]>([]);
  const [suggestions, setSuggestions] = useState<RankedMon[]>([]);
  const [building, setBuilding] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getTeam(teamId).then((t) => setTeam(t ?? null));
    }, [teamId]),
  );

  const gen = team ? Number(team.format.match(/^gen(\d+)/)?.[1] ?? 9) : 9;
  useEffect(() => {
    getFormatsForGen(gen).then(setFormats);
  }, [gen]);

  useEffect(() => {
    if (!team) return;
    let cancelled = false;
    getUsageRanking(team.format)
      .then((r) => !cancelled && setSuggestions(r))
      .catch(() => !cancelled && setSuggestions([]));
    return () => {
      cancelled = true;
    };
  }, [team?.format]);

  const update = (next: SavedTeam) => {
    setTeam(next);
    upsertTeam(next);
  };

  const addByName = (name: string, entry: TeamMember['entry']) => {
    if (!team || team.members.length >= 6) return;
    const id = toId(name);
    if (team.members.some((m) => m.id === id)) return;
    update({ ...team, members: [...team.members, { id, entry }] });
  };

  // "Armar automático" solo elige las especies (algoritmo de coberturas/counters). El
  // rellenado de movs/habilidad/EVs se hace por Pokémon con "Usar set recomendado".
  const autoBuild = async () => {
    if (!team) return;
    setBuilding(true);
    try {
      const names = await autoTeam(team.format, team.members.map((m) => m.entry.name));
      const resolve = await loadEntryResolver();
      const existing = new Map(team.members.map((m) => [m.id, m]));
      const members = names
        .map((n) => existing.get(toId(n)) ?? { id: toId(n), entry: resolve(n) })
        .filter((m): m is TeamMember => !!m.entry)
        .slice(0, 6);
      update({ ...team, members });
    } finally {
      setBuilding(false);
    }
  };

  const analysis = useMemo(() => {
    if (!team) return [];
    return teamTypeAnalysis(team.members.map((m) => m.entry.types))
      .filter((s) => s.weak > 0 || s.resist > 0)
      .sort((a, b) => b.weak - a.weak);
  }, [team]);
  const shared = analysis.filter((s) => s.weak >= 2).length;

  // Control de trampas: qué Pokémon APRENDEN cada mov de utilidad, y si lo tienen asignado.
  type Who = { name: string; assigned: boolean };
  const [utility, setUtility] = useState<{ setters: [string, Who[]][]; removal: [string, Who[]][] }>({
    setters: [],
    removal: [],
  });
  // Depende de miembros y de sus sets (para el estado asignado/verde-rojo).
  const memberKey = team?.members.map((m) => `${m.id}:${(m.set?.moves ?? []).map((x) => x?.id).join('-')}`).join(',');
  useEffect(() => {
    if (!team) return;
    let cancelled = false;
    Promise.all(
      team.members.map((m) => getMovePool(m.entry).then((pool) => ({ member: m, pool }))),
    ).then((pools) => {
      if (cancelled) return;
      const who = (moveId: string): Who[] =>
        pools
          .filter((p) => p.pool.has(moveId))
          .map((p) => ({
            name: p.member.entry.name,
            assigned: (p.member.set?.moves ?? []).some((mv) => mv?.id === moveId),
          }));
      setUtility({
        setters: HAZARD_SETTERS.map(([id, label]) => [label, who(id)] as [string, Who[]]),
        removal: HAZARD_REMOVAL.map(([id, label]) => [label, who(id)] as [string, Who[]]),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [memberKey]);
  const teamLevel = team?.level ?? 100;

  // Las 6 estadísticas YA modificadas (EVs + naturaleza + IVs) al nivel del equipo, en orden.
  const computedStats = (m: TeamMember): [StatKey, number][] => {
    const set = m.set;
    return STAT_ORDER.map((k) => [
      k,
      calcStat(k, m.entry.baseStats[k], set?.evs[k] ?? 0, teamLevel, set?.nature, set?.ivs[k] ?? 31),
    ]) as [StatKey, number][];
  };

  if (!team) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </ScreenBackground>
    );
  }

  const inTeam = new Set(team.members.map((m) => m.id));
  const suggList = suggestions.filter((s) => s.entry && !inTeam.has(toId(s.name))).slice(0, 20);

  return (
    <ScreenBackground>
      <FormatBars
        gen={gen}
        setGen={(g) => update({ ...team, format: `gen${g}ou` })}
        formats={formats}
        format={team.format}
        setFormat={(f) => update({ ...team, format: f })}
      />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
        <TextInput
          style={styles.nameInput}
          value={team.name}
          onChangeText={(name) => update({ ...team, name })}
          placeholder="Nombre del equipo"
          placeholderTextColor={colors.textDim}
        />

        {/* Acciones */}
        <View style={styles.actions}>
          <Pressable style={styles.autoBtn} onPress={autoBuild} disabled={building}>
            {building ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={styles.autoText}>Armar automático</Text>
              </>
            )}
          </Pressable>
          {team.members.length > 0 ? (
            <Pressable style={styles.clearBtn} onPress={() => update({ ...team, members: [] })}>
              <Text style={styles.clearText}>Vaciar</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Miembros (lista con movs, mejores stats y naturaleza) */}
        <View style={styles.countRow}>
          <Text style={styles.count}>{team.members.length}/6</Text>
          <View style={styles.lvls}>
            <Text style={styles.lvlLbl}>Nivel:</Text>
            {[50, 100].map((lv) => (
              <Pressable
                key={lv}
                style={[styles.lvl, teamLevel === lv && styles.lvlOn]}
                onPress={() => update({ ...team, level: lv })}
              >
                <Text style={[styles.lvlTxt, teamLevel === lv && styles.lvlTxtOn]}>{lv}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {team.members.map((m) => {
          const moves = (m.set?.moves ?? []).filter(Boolean);
          const stats = computedStats(m);
          return (
            <Pressable
              key={m.id}
              style={({ pressed }) => [styles.member, pressed && styles.memberPressed]}
              onPress={() => navigation.navigate('TeamMemberEdit', { teamId, memberId: m.id })}
            >
              <PokeImage sources={spriteCandidates(m.entry)} style={styles.mSprite} />
              <View style={styles.mInfo}>
                <View style={styles.mTop}>
                  <Text style={styles.mName} numberOfLines={1}>{m.entry.name}</Text>
                  {m.entry.types.map((t) => (
                    <TypeBadge key={t} type={t} small />
                  ))}
                  {m.set?.tera ? <TypeBadge type={m.set.tera} small tera /> : null}
                </View>
                {(m.set?.nature || m.set?.ability) ? (
                  <Text style={styles.mNature}>
                    {[m.set?.nature ? natureEs(m.set.nature) : null, m.set?.ability].filter(Boolean).join('  ·  ')}
                  </Text>
                ) : null}
                <Text style={styles.mMeta}>
                  {stats.map(([k, v]) => `${STAT_SHORT[k]} ${v}`).join('   ')}
                </Text>
                <Text style={styles.mMoves} numberOfLines={2}>
                  {moves.length ? moves.map((mv) => mv!.name).join(' / ') : 'Sin movimientos — toca para editar'}
                </Text>
              </View>
              <Pressable
                style={styles.mRemove}
                hitSlop={8}
                onPress={() => update({ ...team, members: team.members.filter((x) => x.id !== m.id) })}
              >
                <Ionicons name="close-circle" size={22} color={colors.accent} />
              </Pressable>
            </Pressable>
          );
        })}
        {team.members.length < 6 ? (
          <Pressable style={styles.addRow} onPress={() => navigation.navigate('TeamPicker', { teamId })}>
            <Ionicons name="add" size={22} color={colors.accent} />
            <Text style={styles.addText}>Añadir Pokémon</Text>
          </Pressable>
        ) : null}

        {/* Control de campo (movimientos de utilidad muy usados) */}
        {team.members.length ? (
          <>
            <Text style={styles.section}>Control de campo</Text>
            {utility.setters.concat(utility.removal).map(([label, who]) =>
              who.length ? (
                <View key={label} style={styles.hazRow}>
                  <Text style={styles.hazLabel}>{label}</Text>
                  <Text style={styles.hazWho} numberOfLines={2}>
                    {who.map((w, i) => (
                      <Text key={w.name} style={w.assigned ? styles.whoOn : styles.whoOff}>
                        {i > 0 ? ', ' : ''}{w.name}
                      </Text>
                    ))}
                  </Text>
                </View>
              ) : null,
            )}
            <Text style={styles.hazHint}>Verde = lo lleva asignado · Rojo = puede aprenderlo pero no lo lleva</Text>
          </>
        ) : null}

        {/* Sugerencias por uso del tier */}
        {suggList.length && team.members.length < 6 ? (
          <>
            <Text style={styles.section}>Sugerencias del tier (por uso)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sugRow}>
              {suggList.map((s) => (
                <Pressable key={s.name} style={styles.sug} onPress={() => addByName(s.name, s.entry!)}>
                  <PokeImage sources={spriteCandidates(s.entry!)} style={styles.sugSprite} />
                  <Text style={styles.sugName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.sugUse}>{(s.usage * 100).toFixed(0)}%</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* Debilidades */}
        <Text style={styles.section}>Debilidades del equipo</Text>
        {team.members.length === 0 ? (
          <Text style={styles.dim}>Añade Pokémon (o pulsa “Armar automático”) para ver las debilidades combinadas.</Text>
        ) : (
          <>
            <Text style={styles.dim}>
              {shared > 0
                ? `⚠ ${shared} tipo(s) golpean a 2+ miembros.`
                : 'Sin debilidades compartidas graves.'}
            </Text>
            {analysis.map((s) => (
              <View key={s.type} style={styles.aRow}>
                <TypeBadge type={s.type} small />
                <View style={styles.aCounts}>
                  <Text style={[styles.weak, s.weak >= 2 && styles.weakBad]}>
                    {s.weak > 0 ? `${s.weak} débil${s.weak > 1 ? 'es' : ''}${s.weak >= 2 ? ' ⚠' : ''}` : '—'}
                  </Text>
                  <Text style={styles.resist}>{s.resist > 0 ? `${s.resist} resisten` : ''}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nameInput: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  autoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 11,
  },
  autoText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  clearBtn: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  clearText: { color: colors.textDim, fontWeight: '800' },

  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 },
  count: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  lvls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lvlLbl: { color: colors.textDim, fontSize: 12, fontWeight: '700', marginRight: 2 },
  lvl: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  lvlOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  lvlTxt: { color: colors.textDim, fontWeight: '800', fontSize: 13 },
  lvlTxtOn: { color: '#fff' },

  member: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  memberPressed: { opacity: 0.7 },
  mSprite: { width: 58, height: 58, marginRight: 14 },
  mInfo: { flex: 1, gap: 3 },
  mTop: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  teraSep: { marginLeft: 2 },
  mName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  mMeta: { color: colors.textDim, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  mNature: { color: colors.accent, fontWeight: '800', fontSize: 12 },
  mMoves: { color: colors.text, fontSize: 12, lineHeight: 16 },
  mRemove: { paddingLeft: 10 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textDim,
    borderRadius: 12,
    paddingVertical: 12,
  },
  addText: { color: colors.accent, fontWeight: '800' },

  hazardWarn: { color: colors.accent, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  hazRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5, gap: 12 },
  hazLabel: { color: colors.text, fontSize: 13, fontWeight: '800', width: 120 },
  hazWho: { flex: 1, fontSize: 12 },
  whoOn: { color: '#4ec36a', fontWeight: '800' },
  whoOff: { color: colors.accent, fontWeight: '600' },
  hazHint: { color: colors.textDim, fontSize: 11, fontStyle: 'italic', marginTop: 8 },

  section: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 22, marginBottom: 8 },
  sugRow: { gap: 8, paddingRight: 8 },
  sug: {
    width: 72,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
  },
  sugSprite: { width: 50, height: 50 },
  sugName: { color: colors.text, fontSize: 10, fontWeight: '600', textAlign: 'center', maxWidth: 66 },
  sugUse: { color: colors.accent, fontSize: 10, fontWeight: '800' },

  dim: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  aRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.border },
  aCounts: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: 10 },
  weak: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
  weakBad: { color: colors.accent, fontWeight: '900' },
  resist: { color: colors.textDim, fontSize: 12 },
});
