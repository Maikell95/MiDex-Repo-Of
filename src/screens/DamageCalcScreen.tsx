import { Ionicons } from '@expo/vector-icons';
import { calculate, Field, Generations, Move, Pokemon } from '@smogon/calc';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getLearnedMoves, loadSpeciesList } from '../api/dex';
import { loadCompetitiveItems } from '../api/items';
import BottomSheet from '../components/BottomSheet';
import ItemIcon from '../components/ItemIcon';
import PokeImage from '../components/PokeImage';
import ScreenBackground from '../components/ScreenBackground';
import TypeBadge from '../components/TypeBadge';
import { NATURES } from '../natures';
import { colors } from '../theme';
import { ALL_TYPES, defensiveMultipliers } from '../typeChart';
import type { DexEntry, LearnedMove, StatKey } from '../types';
import { spriteCandidates, toId } from '../utils';

const GEN = Generations.get(9);
// @smogon/calc espera tipos capitalizados (Fire, Water…); nuestros tipos son en minúscula.
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
// Nombre canónico del objeto en el motor por id (el cálculo compara por nombre exacto en inglés).
const ITEM_NAME_BY_ID = new Map<string, string>();
for (const it of GEN.items) ITEM_NAME_BY_ID.set(it.id, it.name);

// Objeto competitivo listo para el selector: nombre del motor (para calcular), nombre ES + icono.
interface ItemOption { calc: string; es: string; slug: string; spritenum?: number }

// Bayas curativas de un solo uso (el motor no las simula en el KO, a diferencia de
// Restos/Sobras Asquerosas). Fracción de PS máx. que curan, o cantidad fija.
const HEAL_BERRY_FRAC: Record<string, number> = {
  'Sitrus Berry': 0.25,
  'Figy Berry': 1 / 3, 'Wiki Berry': 1 / 3, 'Mago Berry': 1 / 3, 'Aguav Berry': 1 / 3, 'Iapapa Berry': 1 / 3,
};
const HEAL_BERRY_FLAT: Record<string, number> = { 'Oran Berry': 10, 'Berry Juice': 20 };

// Movimiento seleccionado para el cálculo (varios a la vez, con opciones por mov).
interface SelMove { name: string; hpType?: string; hits?: number }
// Tipos elegibles para el Poder Oculto (todos menos Normal y Hada).
const HP_TYPES = ['fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'];
const isHP = (name: string) => /hidden\s*power/i.test(name);
// Niveles de característica (-6..+6).
const clampBoost = (n: number) => Math.max(-6, Math.min(6, n));
const fmtStage = (n: number) => (n > 0 ? `+${n}` : `${n}`);

const WEATHERS = ['Sun', 'Rain', 'Sand', 'Snow'] as const;
const TERRAINS = ['Electric', 'Grassy', 'Psychic', 'Misty'] as const;
// Estados: '' = sano. Afectan al Ataque (quemadura) y a movimientos como Imagen/Nocturno.
const STATUSES: Array<{ k: string; es: string }> = [
  { k: '', es: 'Sano' },
  { k: 'brn', es: 'Quemado' },
  { k: 'par', es: 'Paralizado' },
  { k: 'psn', es: 'Envenenado' },
  { k: 'tox', es: 'Muy envenenado' },
  { k: 'slp', es: 'Dormido' },
  { k: 'frz', es: 'Congelado' },
];

interface Side {
  name: string;
  entry?: DexEntry;
  level: number;
  nature: string;
  evs: Partial<Record<StatKey, number>>;
  item?: string;
  ability?: string;
  tera?: string; // tipo Tera activo (minúscula), undefined = sin teracristalizar
  status?: string; // '' = sano; 'brn' | 'par' | 'psn' | 'tox' | 'slp' | 'frz'
  boosts?: Partial<Record<StatKey, number>>; // niveles de característica -6..+6
}
const emptySide = (): Side => ({ name: '', level: 100, nature: 'Hardy', evs: {} });

export default function DamageCalcScreen() {
  const [species, setSpecies] = useState<Array<[string, DexEntry]>>([]);
  const [attacker, setAttacker] = useState<Side>(emptySide());
  const [defender, setDefender] = useState<Side>(emptySide());
  const [moves, setMoves] = useState<SelMove[]>([]);
  const [atkMoves, setAtkMoves] = useState<LearnedMove[]>([]);
  const [field, setField] = useState<{
    weather?: string;
    terrain?: string;
    sr?: boolean;
    spikes?: number;
    reflect?: boolean;
    lightScreen?: boolean;
    auroraVeil?: boolean;
  }>({});
  const [picking, setPicking] = useState<'attacker' | 'defender' | 'move' | null>(null);
  const [pickingItem, setPickingItem] = useState<'attacker' | 'defender' | null>(null);
  const [query, setQuery] = useState('');
  const [itemQuery, setItemQuery] = useState('');
  const [items, setItems] = useState<ItemOption[]>([]);
  const [copied, setCopied] = useState(false);
  const [detailKey, setDetailKey] = useState<string | null>(null); // mov cuyo cálculo se muestra

  useEffect(() => {
    loadSpeciesList().then(setSpecies);
    // Objetos competitivos (curados) cruzados con los que reconoce el motor.
    loadCompetitiveItems()
      .then((groups) => {
        const seen = new Set<string>();
        const flat: ItemOption[] = [];
        for (const g of groups) {
          for (const it of g.items) {
            const calc = ITEM_NAME_BY_ID.get(toId(it.slug));
            if (!calc || seen.has(calc)) continue;
            seen.add(calc);
            flat.push({ calc, es: it.name, slug: it.slug, spritenum: it.spritenum });
          }
        }
        flat.sort((a, b) => a.es.localeCompare(b.es));
        setItems(flat);
      })
      .catch(() => {});
  }, []);

  // Movimientos del atacante cuando cambia.
  useEffect(() => {
    if (!attacker.entry) return setAtkMoves([]);
    getLearnedMoves(attacker.name, attacker.entry).then((ms) =>
      setAtkMoves(ms.filter((m) => m.move.category !== 'Status')),
    );
    setMoves([]);
  }, [attacker.entry?.name]);

  // Añade/quita un movimiento de la lista (máx. 4), con opciones por defecto.
  const toggleMove = (lm: LearnedMove) => {
    setMoves((prev) => {
      if (prev.some((m) => m.name === lm.move.name)) return prev.filter((m) => m.name !== lm.move.name);
      if (prev.length >= 4) return prev;
      const mh = lm.move.multihit;
      const hits = Array.isArray(mh) ? Math.min(mh[1], Math.max(mh[0], 3)) : typeof mh === 'number' ? mh : undefined;
      return [...prev, { name: lm.move.name, hits, hpType: isHP(lm.move.name) ? 'ice' : undefined }];
    });
  };
  const patchMove = (name: string, patch: Partial<SelMove>) =>
    setMoves((prev) => prev.map((m) => (m.name === name ? { ...m, ...patch } : m)));

  // Un resultado por movimiento, ordenados por el que debilita más rápido (menos golpes
  // para el KO; a igualdad, mayor probabilidad; luego, más daño máximo).
  const results = useMemo(() => {
    if (!attacker.name || !defender.name || !moves.length) return [];
    let atkP: Pokemon, defP: Pokemon, f: Field;
    try {
      const mk = (s: Side) =>
        new Pokemon(GEN, s.name, {
          level: s.level,
          nature: s.nature,
          evs: s.evs,
          item: s.item || undefined,
          ability: s.ability || undefined,
          teraType: s.tera ? (cap(s.tera) as never) : undefined,
          status: (s.status || '') as never,
          boosts: (s.boosts ?? {}) as never,
        });
      atkP = mk(attacker);
      defP = mk(defender);
      f = new Field({
        weather: field.weather as never,
        terrain: field.terrain as never,
        // Peligros y pantallas protegen/afectan al defensor → su lado del campo.
        defenderSide: {
          isSR: !!field.sr,
          spikes: field.spikes ?? 0,
          isReflect: !!field.reflect,
          isLightScreen: !!field.lightScreen,
          isAuroraVeil: !!field.auroraVeil,
        } as never,
      });
    } catch {
      return [];
    }

    const mkMove = (sm: SelMove) => {
      const opts: Record<string, unknown> = {};
      if (sm.hits != null) opts.hits = sm.hits;
      if (isHP(sm.name)) {
        opts.overrides = { type: cap(sm.hpType || 'ice'), basePower: 60 };
        return new Move(GEN, 'Hidden Power', opts as never);
      }
      return new Move(GEN, sm.name, opts as never);
    };

    const out = moves
      .map((sm) => {
        try {
          const res = calculate(GEN, atkP, defP, mkMove(sm), f);
          const ko = (res.kochance?.() ?? {}) as { n?: number; chance?: number; text?: string };
          const [rMin, rMax] = res.range();
          const maxHP = res.defender.maxHP();
          const lm = atkMoves.find((m) => m.move.name === sm.name);
          const type = isHP(sm.name) && sm.hpType ? sm.hpType : lm?.move.type ?? 'normal';
          let recoilPct = '';
          try {
            const r = res.recoil?.();
            if (r && r.text && r.recoil) recoilPct = r.text;
          } catch {}
          // Baya curativa del defensor (un solo uso): el motor no la incluye en el KO.
          let berryNote = '';
          const frac = HEAL_BERRY_FRAC[defender.item ?? ''];
          const flat = HEAL_BERRY_FLAT[defender.item ?? ''];
          if ((frac || flat) && rMin > 0) {
            const heal = flat ?? Math.floor(maxHP * frac);
            const withBerry = Math.ceil((maxHP + heal) / rMin); // golpes garantizados con la baya
            berryNote = `${defender.item}: cura ~${heal} PS → ≈${withBerry} golpes para el KO`;
          }
          const n = ko.n && ko.n > 0 ? ko.n : Infinity;
          return {
            key: sm.name,
            label: lm?.nameEs ?? sm.name,
            type,
            hits: sm.hits,
            desc: res.desc(),
            koText: ko.text ?? '',
            recoilPct,
            berryNote,
            n,
            chance: ko.chance ?? 0,
            maxDmg: rMax,
            pct: [((rMin / maxHP) * 100).toFixed(1), ((rMax / maxHP) * 100).toFixed(1)] as [string, string],
          };
        } catch {
          return null;
        }
      })
      .filter((r): r is NonNullable<typeof r> => !!r);

    out.sort((a, b) => a.n - b.n || b.chance - a.chance || b.maxDmg - a.maxDmg);
    return out;
  }, [attacker, defender, moves, field, atkMoves]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return species;
    const isNum = /^\d+$/.test(q);
    return species.filter(([, e]) => (isNum ? String(e.num).includes(q) : e.name.toLowerCase().includes(q)));
  }, [species, query]);

  const filteredItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    return q ? items.filter((i) => i.es.toLowerCase().includes(q) || i.calc.toLowerCase().includes(q)) : items;
  }, [items, itemQuery]);

  const setSide = picking === 'attacker' ? setAttacker : setDefender;
  const pickPokemon = (id: string, e: DexEntry) => {
    setSide({ ...emptySide(), name: e.name, entry: e, ability: Object.values(e.abilities)[0] });
    setPicking(null);
  };
  const pickItem = (calc?: string) => {
    const set = pickingItem === 'attacker' ? setAttacker : setDefender;
    const cur = pickingItem === 'attacker' ? attacker : defender;
    set({ ...cur, item: calc });
    setPickingItem(null);
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        <SideCard
          title="Atacante"
          side={attacker}
          setSide={setAttacker}
          offensive
          items={items}
          onPick={() => { setQuery(''); setPicking('attacker'); }}
          onPickItem={() => { setItemQuery(''); setPickingItem('attacker'); }}
          moveSlot={
            <View style={styles.moveBox}>
              <Text style={styles.moveBoxTitle}>Movimientos · {moves.length}/4</Text>
              {moves.map((sm) => {
                const lm = atkMoves.find((m) => m.move.name === sm.name);
                const mh = lm?.move.multihit;
                const hp = isHP(sm.name);
                const type = hp && sm.hpType ? sm.hpType : lm?.move.type ?? 'normal';
                return (
                  <View key={sm.name} style={styles.mvRow}>
                    <View style={styles.mvHead}>
                      <TypeBadge type={type} small />
                      <Text style={styles.mvName} numberOfLines={1}>{lm?.nameEs ?? sm.name}</Text>
                      <Pressable hitSlop={8} onPress={() => setMoves((prev) => prev.filter((m) => m.name !== sm.name))}>
                        <Ionicons name="close-circle" size={20} color={colors.accent} />
                      </Pressable>
                    </View>
                    {/* Golpes múltiples: elegir cuántos golpes calcular */}
                    {Array.isArray(mh) ? (
                      <View style={styles.mvOpts}>
                        <Text style={styles.mvOptLbl}>Golpes</Text>
                        {Array.from({ length: mh[1] - mh[0] + 1 }, (_, i) => mh[0] + i).map((h) => (
                          <Chip key={h} label={`${h}`} on={sm.hits === h} onPress={() => patchMove(sm.name, { hits: h })} />
                        ))}
                      </View>
                    ) : null}
                    {/* Poder Oculto: elegir el tipo */}
                    {hp ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mvOpts}>
                        <Text style={styles.mvOptLbl}>Tipo</Text>
                        {HP_TYPES.map((t) => (
                          <Pressable key={t} onPress={() => patchMove(sm.name, { hpType: t })} style={[styles.teraChip, sm.hpType !== t && { opacity: 0.4 }]}>
                            <TypeBadge type={t} small />
                          </Pressable>
                        ))}
                      </ScrollView>
                    ) : null}
                  </View>
                );
              })}
              {moves.length < 4 ? (
                <Pressable style={styles.moveBtn} onPress={() => setPicking('move')} disabled={!attacker.entry}>
                  <Text style={styles.moveTxt}>+ Añadir movimiento</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />

        <SideCard
          title="Defensor"
          side={defender}
          setSide={setDefender}
          items={items}
          onPick={() => { setQuery(''); setPicking('defender'); }}
          onPickItem={() => { setItemQuery(''); setPickingItem('defender'); }}
        />

        {/* Campo */}
        <Text style={styles.section}>Clima / Campo</Text>
        <View style={styles.chipsWrap}>
          {WEATHERS.map((w) => (
            <Chip key={w} label={w} on={field.weather === w} onPress={() => setField((f) => ({ ...f, weather: f.weather === w ? undefined : w }))} />
          ))}
          {TERRAINS.map((t) => (
            <Chip key={t} label={`Campo ${t}`} on={field.terrain === t} onPress={() => setField((f) => ({ ...f, terrain: f.terrain === t ? undefined : t }))} />
          ))}
        </View>

        {/* Peligros sobre el defensor */}
        <Text style={styles.section}>Peligros (sobre el defensor)</Text>
        <View style={styles.chipsWrap}>
          <Chip label="Trampa Rocas" on={!!field.sr} onPress={() => setField((f) => ({ ...f, sr: !f.sr }))} />
          {[1, 2, 3].map((n) => (
            <Chip key={n} label={`Púas ×${n}`} on={field.spikes === n} onPress={() => setField((f) => ({ ...f, spikes: f.spikes === n ? 0 : n }))} />
          ))}
        </View>

        {/* Pantallas sobre el defensor (reducen el daño a la mitad) */}
        <Text style={styles.section}>Pantallas (sobre el defensor)</Text>
        <View style={styles.chipsWrap}>
          <Chip label="Reflejo" on={!!field.reflect} onPress={() => setField((f) => ({ ...f, reflect: !f.reflect }))} />
          <Chip label="Pantalla Luz" on={!!field.lightScreen} onPress={() => setField((f) => ({ ...f, lightScreen: !f.lightScreen }))} />
          <Chip label="Velo Aurora" on={!!field.auroraVeil} onPress={() => setField((f) => ({ ...f, auroraVeil: !f.auroraVeil }))} />
        </View>

        {/* Resultado: resumen ordenado. Toca un movimiento para ver su cálculo. */}
        <View style={styles.result}>
          {results.length ? (
            <>
              <Text style={styles.resTitle}>Resumen</Text>
              {results.map((r, i) => (
                <Pressable
                  key={r.key}
                  style={({ pressed }) => [styles.rankRow, i === 0 && styles.rankBest, pressed && styles.rankPressed]}
                  onPress={() => setDetailKey(r.key)}
                >
                  <Text style={[styles.rankNum, i === 0 && styles.rankNumBest]}>{i + 1}</Text>
                  <View style={styles.rankBody}>
                    <View style={styles.rankHead}>
                      <TypeBadge type={r.type} small />
                      <Text style={styles.rankName} numberOfLines={1}>
                        {r.label}{r.hits ? ` ×${r.hits}` : ''}
                      </Text>
                      <Text style={styles.rankPct}>{r.pct[0]}-{r.pct[1]}%</Text>
                    </View>
                    <Text style={styles.rankKo}>{r.koText || 'No debilita'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                </Pressable>
              ))}
            </>
          ) : (
            <Text style={styles.resDim}>Elige atacante, al menos un movimiento y defensor para calcular el daño.</Text>
          )}
        </View>
      </ScrollView>

      {/* Hoja Pokémon */}
      <BottomSheet visible={picking === 'attacker' || picking === 'defender'} onClose={() => setPicking(null)}>
        {(scroll) => (
          <>
            <TextInput style={styles.search} placeholder="Buscar Pokémon…" placeholderTextColor={colors.textDim} value={query} onChangeText={setQuery} />
            <FlatList
              data={filtered}
              keyExtractor={([id]) => id}
              initialNumToRender={16}
              keyboardShouldPersistTaps="handled"
              {...scroll}
              renderItem={({ item: [id, e] }) => (
                <Pressable style={styles.opt} onPress={() => pickPokemon(id, e)}>
                  <PokeImage sources={spriteCandidates(e)} style={styles.optSprite} />
                  <Text style={styles.optName}>{e.name}</Text>
                  {e.types.map((t) => <TypeBadge key={t} type={t} small />)}
                </Pressable>
              )}
            />
          </>
        )}
      </BottomSheet>

      {/* Hoja movimiento (multi-selección) */}
      <BottomSheet visible={picking === 'move'} onClose={() => setPicking(null)}>
        {(scroll) => (
          <>
            <Text style={styles.modalTitle}>Movimientos del atacante · {moves.length}/4</Text>
            <FlatList
              data={atkMoves}
              keyExtractor={(m) => m.id}
              initialNumToRender={20}
              keyboardShouldPersistTaps="handled"
              {...scroll}
              renderItem={({ item }) => {
                const on = moves.some((m) => m.name === item.move.name);
                const full = moves.length >= 4;
                return (
                  <Pressable style={styles.opt} disabled={!on && full} onPress={() => toggleMove(item)}>
                    <Ionicons
                      name={on ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={on ? colors.accent : full ? colors.border : colors.textDim}
                    />
                    <Text style={[styles.optName, !on && full && { color: colors.textDim }]}>{item.nameEs}</Text>
                    <TypeBadge type={item.move.type} small />
                    <Text style={styles.optBp}>{item.move.basePower || '—'}</Text>
                  </Pressable>
                );
              }}
            />
            <Pressable style={styles.closeBtn} onPress={() => setPicking(null)}><Text style={styles.closeTxt}>Listo</Text></Pressable>
          </>
        )}
      </BottomSheet>

      {/* Hoja objeto */}
      <BottomSheet visible={pickingItem !== null} onClose={() => setPickingItem(null)}>
        {(scroll) => (
          <>
            <TextInput style={styles.search} placeholder="Buscar objeto…" placeholderTextColor={colors.textDim} value={itemQuery} onChangeText={setItemQuery} />
            <FlatList
              data={filteredItems}
              keyExtractor={(it) => it.calc}
              initialNumToRender={16}
              keyboardShouldPersistTaps="handled"
              {...scroll}
              ListHeaderComponent={
                <Pressable style={styles.opt} onPress={() => pickItem(undefined)}>
                  <View style={styles.itemIconPh} />
                  <Text style={styles.optName}>Sin objeto</Text>
                </Pressable>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.opt} onPress={() => pickItem(item.calc)}>
                  <ItemIcon spritenum={item.spritenum} slug={item.slug} size={30} />
                  <Text style={styles.optName}>{item.es}</Text>
                </Pressable>
              )}
            />
          </>
        )}
      </BottomSheet>

      {/* Modal detalle del cálculo de un movimiento */}
      <Modal visible={detailKey !== null} animationType="fade" transparent onRequestClose={() => setDetailKey(null)}>
        {(() => {
          const r = results.find((x) => x.key === detailKey);
          if (!r) return <View style={styles.detailBg} />;
          const full = `${r.desc}${r.recoilPct ? ` -- Retroceso: ${r.recoilPct}` : ''}${r.berryNote ? ` -- ${r.berryNote}` : ''}`;
          return (
            <Pressable style={styles.detailBg} onPress={() => setDetailKey(null)}>
              <Pressable style={styles.detailCard} onPress={() => {}}>
                <View style={styles.detailHead}>
                  <TypeBadge type={r.type} small />
                  <Text style={styles.detailName}>{r.label}{r.hits ? ` ×${r.hits}` : ''}</Text>
                </View>
                <Text style={styles.detailKo}>{r.koText || 'No debilita'}</Text>
                <Text style={styles.detailDesc}>{r.desc}</Text>
                {r.berryNote ? <Text style={styles.detailBerry}>🍓 {r.berryNote}</Text> : null}
                {r.recoilPct ? <Text style={styles.detailRecoil}>Retroceso al atacante: {r.recoilPct}</Text> : null}
                <View style={styles.detailBtns}>
                  <Pressable
                    style={styles.detailCopy}
                    onPress={async () => {
                      await Clipboard.setStringAsync(full);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#fff" />
                    <Text style={styles.detailCopyTxt}>{copied ? 'Copiado' : 'Copiar'}</Text>
                  </Pressable>
                  <Pressable style={styles.detailClose} onPress={() => setDetailKey(null)}>
                    <Text style={styles.detailCloseTxt}>Cerrar</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          );
        })()}
      </Modal>
    </ScreenBackground>
  );
}

function SideCard({
  title,
  side,
  setSide,
  offensive,
  items,
  onPick,
  onPickItem,
  moveSlot,
}: {
  title: string;
  side: Side;
  setSide: (s: Side) => void;
  offensive?: boolean;
  items: ItemOption[];
  onPick: () => void;
  onPickItem: () => void;
  moveSlot?: React.ReactNode;
}) {
  const sel = side.item ? items.find((i) => i.calc === side.item) : undefined;
  const evKeys: StatKey[] = offensive ? ['atk', 'spa'] : ['hp', 'def', 'spd'];
  const evLbl: Record<string, string> = { atk: 'Atk', spa: 'AtEsp', hp: 'PS', def: 'Def', spd: 'DefEsp' };
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.lvls}>
          {[50, 100].map((lv) => (
            <Pressable key={lv} style={[styles.lv, side.level === lv && styles.lvOn]} onPress={() => setSide({ ...side, level: lv })}>
              <Text style={[styles.lvT, side.level === lv && styles.lvTOn]}>Nv{lv}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Pressable style={styles.pickRow} onPress={onPick}>
        {side.entry ? (
          <>
            <PokeImage sources={spriteCandidates(side.entry)} style={styles.pickSprite} />
            <Text style={styles.pickName}>{side.name}</Text>
            {side.entry.types.map((t) => <TypeBadge key={t} type={t} small />)}
          </>
        ) : (
          <Text style={styles.pickEmpty}>+ Elegir Pokémon</Text>
        )}
      </Pressable>

      {side.entry ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {NATURES.map((n) => (
              <Chip key={n.name} label={n.es} on={side.nature === n.name} onPress={() => setSide({ ...side, nature: n.name })} />
            ))}
          </ScrollView>
          <View style={styles.evRow}>
            {evKeys.map((k) => (
              <View key={k} style={styles.evItem}>
                <Text style={styles.evLbl}>{evLbl[k]}</Text>
                <TextInput
                  style={styles.evInput}
                  keyboardType="number-pad"
                  value={String(side.evs[k] ?? 0)}
                  onChangeText={(t) => setSide({ ...side, evs: { ...side.evs, [k]: Math.max(0, Math.min(252, parseInt(t, 10) || 0)) } })}
                />
                {/* Nivel de característica (-6..+6), no aplica a PS */}
                {k !== 'hp' ? (
                  <View style={styles.boostRow}>
                    <Pressable
                      style={styles.boostBtn}
                      onPress={() => setSide({ ...side, boosts: { ...side.boosts, [k]: clampBoost((side.boosts?.[k] ?? 0) - 1) } })}
                    >
                      <Text style={styles.boostSign}>−</Text>
                    </Pressable>
                    <Text style={[styles.boostVal, (side.boosts?.[k] ?? 0) !== 0 && styles.boostValOn]}>{fmtStage(side.boosts?.[k] ?? 0)}</Text>
                    <Pressable
                      style={styles.boostBtn}
                      onPress={() => setSide({ ...side, boosts: { ...side.boosts, [k]: clampBoost((side.boosts?.[k] ?? 0) + 1) } })}
                    >
                      <Text style={styles.boostSign}>+</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
          {side.entry.abilities ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {Object.values(side.entry.abilities).filter(Boolean).map((ab) => (
                <Chip key={ab} label={ab} on={side.ability === ab} onPress={() => setSide({ ...side, ability: ab })} />
              ))}
            </ScrollView>
          ) : null}
          <Text style={styles.teraLbl}>Teratipo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <Chip label="Sin Tera" on={!side.tera} onPress={() => setSide({ ...side, tera: undefined })} />
            {ALL_TYPES.map((t) => (
              <Pressable key={t} onPress={() => setSide({ ...side, tera: side.tera === t ? undefined : t })} style={[styles.teraChip, side.tera && side.tera !== t && { opacity: 0.4 }]}>
                <TypeBadge type={t} small tera={side.tera === t} />
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.teraLbl}>Estado</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {STATUSES.map((s) => (
              <Chip key={s.k} label={s.es} on={(side.status ?? '') === s.k} onPress={() => setSide({ ...side, status: s.k })} />
            ))}
          </ScrollView>
          <Text style={styles.teraLbl}>Objeto</Text>
          <Pressable style={styles.itemBtn} onPress={onPickItem}>
            {sel ? (
              <>
                <ItemIcon spritenum={sel.spritenum} slug={sel.slug} size={26} />
                <Text style={styles.itemName} numberOfLines={1}>{sel.es}</Text>
              </>
            ) : side.item ? (
              <Text style={styles.itemName} numberOfLines={1}>{side.item}</Text>
            ) : (
              <Text style={styles.itemEmpty}>+ Elegir objeto</Text>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.textDim} style={{ marginLeft: 'auto' }} />
          </Pressable>
          {moveSlot}
        </>
      ) : null}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, on && styles.chipOn]} onPress={onPress}>
      <Text style={[styles.chipT, on && styles.chipTOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  lvls: { flexDirection: 'row', gap: 4 },
  lv: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
  lvOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  lvT: { color: colors.textDim, fontWeight: '800', fontSize: 11 },
  lvTOn: { color: '#fff' },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cardAlt, borderRadius: 10, padding: 8, marginBottom: 8 },
  pickSprite: { width: 44, height: 44 },
  pickName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  pickEmpty: { color: colors.textDim, fontSize: 14, fontWeight: '700', paddingVertical: 6 },
  chipsRow: { gap: 6, paddingVertical: 4 },
  evRow: { flexDirection: 'row', gap: 10, marginVertical: 6 },
  evItem: { alignItems: 'center' },
  evLbl: { color: colors.textDim, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  evInput: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 8, width: 58, textAlign: 'center', paddingVertical: 5, color: colors.text },
  boostRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  boostBtn: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  boostSign: { color: colors.accent, fontSize: 15, fontWeight: '900', lineHeight: 17 },
  boostVal: { minWidth: 20, textAlign: 'center', color: colors.textDim, fontSize: 12, fontWeight: '800' },
  boostValOn: { color: colors.accent },
  moveBtn: { backgroundColor: colors.accent + '22', borderWidth: 1, borderColor: colors.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 6 },
  moveTxt: { color: colors.accent, fontWeight: '800' },

  // Objeto (botón que abre el selector)
  itemBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 8, marginTop: 2 },
  itemName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  itemEmpty: { color: colors.textDim, fontSize: 14, fontWeight: '700' },
  itemIconPh: { width: 30, height: 30, borderRadius: 6, backgroundColor: colors.cardAlt },

  // Gestor de movimientos del atacante
  moveBox: { marginTop: 8, borderTopWidth: 1, borderColor: colors.border, paddingTop: 8 },
  moveBoxTitle: { color: colors.textDim, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  mvRow: { backgroundColor: colors.cardAlt, borderRadius: 10, padding: 8, marginBottom: 6 },
  mvHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mvName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '800' },
  mvOpts: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  mvOptLbl: { color: colors.textDim, fontSize: 11, fontWeight: '700', marginRight: 2 },

  section: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipT: { color: colors.text, fontWeight: '700', fontSize: 12 },
  chipTOn: { color: '#fff' },

  teraLbl: { color: colors.textDim, fontSize: 11, fontWeight: '800', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  teraChip: { marginRight: 2 },

  // Resultado (ranking)
  result: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.accent, padding: 14, minHeight: 90, justifyContent: 'center' },
  resTitle: { color: colors.accent, fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  resDim: { color: colors.textDim, fontSize: 14, textAlign: 'center' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderColor: colors.border },
  rankBest: { borderTopWidth: 0 },
  rankPressed: { opacity: 0.6 },
  rankNum: { width: 20, textAlign: 'center', color: colors.textDim, fontSize: 15, fontWeight: '900' },
  rankNumBest: { color: colors.accent },
  rankBody: { flex: 1 },
  rankHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '800' },
  rankPct: { color: colors.text, fontSize: 13, fontWeight: '800' },
  rankKo: { color: colors.textDim, fontSize: 13, marginTop: 2, lineHeight: 18 },

  // Modal detalle del cálculo
  detailBg: { flex: 1, backgroundColor: '#000b', justifyContent: 'center', padding: 24 },
  detailCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.accent, padding: 18 },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  detailName: { color: colors.text, fontSize: 18, fontWeight: '900' },
  detailKo: { color: colors.accent, fontSize: 15, fontWeight: '900', marginBottom: 8 },
  detailDesc: { color: colors.text, fontSize: 14, lineHeight: 20 },
  detailBerry: { color: colors.accent, fontSize: 13, marginTop: 8, fontWeight: '700' },
  detailRecoil: { color: colors.textDim, fontSize: 13, marginTop: 8, fontWeight: '700' },
  detailBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  detailCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 11 },
  detailCopyTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  detailClose: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt, borderRadius: 10, paddingVertical: 11, borderWidth: 1, borderColor: colors.border },
  detailCloseTxt: { color: colors.text, fontWeight: '800', fontSize: 14 },

  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '800', padding: 8 },
  search: { backgroundColor: colors.card, color: colors.text, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: colors.border },
  optSprite: { width: 40, height: 40 },
  optName: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  optBp: { color: colors.textDim, fontSize: 12, width: 34, textAlign: 'right' },
  closeBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  closeTxt: { color: colors.accent, fontWeight: '800', fontSize: 15 },
});
