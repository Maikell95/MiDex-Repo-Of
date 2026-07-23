import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  formatLabel,
  getCompetitive,
  loadEntryResolver,
  type CompSet,
  type CompetitiveData,
} from '../api/competitive';
import { translateEs } from '../api/translate';
import PokeImage from '../components/PokeImage';
import TypeBadge from '../components/TypeBadge';
import { loadCompetitiveLocale, type CompLocale } from '../localize';
import type { CompetitiveStackParamList } from '../navigation';
import { colors, typeColor } from '../theme';
import type { DexEntry } from '../types';
import { dexNumber, spriteCandidates, stripHtml } from '../utils';

type Props = NativeStackScreenProps<CompetitiveStackParamList, 'CompetitiveDetail'>;

const EV_SHORT: Record<string, string> = { hp: 'PS', atk: 'Atk', def: 'Def', spa: 'AtEsp', spd: 'DefEsp', spe: 'Vel' };
const EV_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

function formatEvs(evs?: Partial<Record<string, number>>): string {
  if (!evs) return '';
  return EV_ORDER.filter((k) => evs[k]).map((k) => `${evs[k]} ${EV_SHORT[k]}`).join(' / ');
}

// Estructura lista para pintar.
interface Ranked { name: string; pct: number; entry?: DexEntry }
interface CompView {
  entry?: DexEntry;
  usage?: number;
  sets: Array<{ name: string; set: CompSet; desc?: string }>;
  items: [string, number][];
  moves: [string, number][];
  abilities: [string, number][];
  tera: [string, number][];
  spreads: [string, number][];
  teammates: Ranked[];
  counters: Ranked[];
}

const top = (obj: Record<string, number> | undefined, n: number): [string, number][] =>
  obj ? Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n) : [];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// Fila "nombre — porcentaje" con barra.
function StatRow({ label, pct }: { label: string; pct: number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.statPct}>{Math.round(pct * 100)}%</Text>
      <View style={styles.statTrack}>
        <View style={[styles.statFill, { width: `${Math.min(100, pct * 100)}%` }]} />
      </View>
    </View>
  );
}

export default function CompetitiveDetailScreen({ route, navigation }: Props) {
  const { name, format } = route.params;
  const [view, setView] = useState<CompView | null>(null);
  const [loc, setLoc] = useState<CompLocale | null>(null);
  const [overviewEs, setOverviewEs] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [data, l, getE] = await Promise.all([
        getCompetitive(name, format),
        loadCompetitiveLocale(),
        loadEntryResolver(),
      ]);
      if (cancelled) return;
      const entry = getE(name);
      const d: CompetitiveData = data;
      const s = d.stat;
      const ranked = (obj?: Record<string, number>, n = 8): Ranked[] =>
        top(obj, n).map(([nm, pct]) => ({ name: nm, pct, entry: getE(nm) }));
      const countersObj: Record<string, number> = {};
      if (s?.counters) for (const [k, v] of Object.entries(s.counters)) countersObj[k] = v[0] ?? 0;

      const v: CompView = {
        entry: entry ?? undefined,
        usage: s?.usage?.weighted,
        sets: d.sets
          ? Object.entries(d.sets).map(([sn, set]) => ({ name: sn, set, desc: d.setDescriptions?.[sn] }))
          : [],
        items: top(s?.items, 6),
        moves: top(s?.moves, 10),
        abilities: top(s?.abilities, 4),
        tera: top(s?.teraTypes, 6),
        spreads: top(s?.spreads, 5),
        teammates: ranked(s?.teammates, 8),
        counters: ranked(countersObj, 6),
      };
      setLoc(l);
      setView(v);
      setLoading(false);
      if (d.overview) translateEs(stripHtml(d.overview)).then((t) => !cancelled && setOverviewEs(t));
    })();
    return () => {
      cancelled = true;
    };
  }, [name, format]);

  if (loading || !view || !loc) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.dim}>Cargando datos competitivos…</Text>
      </View>
    );
  }

  const L = loc;
  const arr = (x?: string | string[]) => (Array.isArray(x) ? x : x ? [x] : []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Cabecera (toca la imagen para ver en la Pokédex) */}
      <View style={styles.header}>
        {view.entry ? (
          <Pressable
            onPress={() =>
              (navigation as any).navigate('PokedexTab', {
                screen: 'Detalle',
                initial: false, // deja la lista de la Pokédex debajo para poder volver
                params: { id: name.toLowerCase().replace(/[^a-z0-9]/g, ''), entry: view.entry },
              })
            }
          >
            <PokeImage sources={spriteCandidates(view.entry)} style={styles.sprite} />
            <Text style={styles.tapHint}>Ver en Pokédex ›</Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.fmtBadge}>
            <Text style={styles.fmtBadgeText}>{formatLabel(format)}</Text>
          </View>
          {view.entry ? <Text style={styles.num}>{dexNumber(view.entry.num)}</Text> : null}
          {view.usage != null ? (
            <Text style={styles.usage}>Uso: {(view.usage * 100).toFixed(1)}%</Text>
          ) : null}
          {view.entry ? (
            <View style={styles.types}>
              {view.entry.types.map((t) => <TypeBadge key={t} type={t} small />)}
            </View>
          ) : null}
        </View>
      </View>

      {/* Overview */}
      {view.sets.length || view.usage != null || overviewEs ? null : (
        <Text style={[styles.dim, { padding: 20 }]}>Sin datos competitivos para {name} en este formato.</Text>
      )}
      {overviewEs ? (
        <Section title="Resumen">
          <Text style={styles.body}>{overviewEs}</Text>
          <Text style={styles.mt}>Traducción automática (EN→ES).</Text>
        </Section>
      ) : null}

      {/* Sets recomendados */}
      {view.sets.length ? (
        <Section title="Sets recomendados">
          {view.sets.map(({ name: sn, set }) => (
            <View key={sn} style={styles.setCard}>
              <Text style={styles.setName}>{sn}</Text>
              {set.moves.map((m, i) => (
                <View key={i} style={styles.moveLine}>
                  <View style={styles.bullet} />
                  <Text style={styles.moveText}>{arr(m).map(L.move).join(' / ')}</Text>
                </View>
              ))}
              <View style={styles.setMeta}>
                {set.item ? <Meta label="Objeto" value={arr(set.item).map(L.item).join(' / ')} /> : null}
                {set.ability ? <Meta label="Habilidad" value={arr(set.ability).map(L.ability).join(' / ')} /> : null}
                {set.nature ? <Meta label="Naturaleza" value={arr(set.nature).map(L.nature).join(' / ')} /> : null}
                {set.teratypes ? <Meta label="Teratipo" value={arr(set.teratypes).map(L.type).join(' / ')} /> : null}
                {set.evs ? <Meta label="EVs" value={formatEvs(set.evs)} /> : null}
              </View>
            </View>
          ))}
        </Section>
      ) : null}

      {/* Estadísticas de uso */}
      {view.moves.length ? (
        <Section title="Movimientos más usados">
          {view.moves.map(([m, p]) => <StatRow key={m} label={L.move(m)} pct={p} />)}
        </Section>
      ) : null}
      {view.items.length ? (
        <Section title="Objetos más usados">
          {view.items.map(([it, p]) => <StatRow key={it} label={L.item(it)} pct={p} />)}
        </Section>
      ) : null}
      {view.abilities.length ? (
        <Section title="Habilidades">
          {view.abilities.map(([a, p]) => <StatRow key={a} label={L.ability(a)} pct={p} />)}
        </Section>
      ) : null}
      {view.tera.length ? (
        <Section title="Teratipos más usados">
          {view.tera.map(([t, p]) => <StatRow key={t} label={L.type(t)} pct={p} />)}
        </Section>
      ) : null}
      {view.spreads.length ? (
        <Section title="Spreads (naturaleza + EVs)">
          {view.spreads.map(([sp, p]) => {
            const [nat, evstr] = sp.split(':');
            const evs = evstr?.split('/').map(Number) ?? [];
            const evText =
              EV_ORDER.map((k, i) => (evs[i] ? `${evs[i]} ${EV_SHORT[k]}` : null))
                .filter(Boolean)
                .join(' / ') || 'Sin EVs';
            return <SpreadItem key={sp} nature={L.nature(nat)} evText={evText} pct={p} />;
          })}
        </Section>
      ) : null}

      {/* Compañeros */}
      {view.teammates.length ? (
        <Section title="Mejores compañeros">
          <SpriteRow items={view.teammates} onPress={(n) => navigation.push('CompetitiveDetail', { name: n, format })} />
        </Section>
      ) : null}

      {/* Counters */}
      {view.counters.length ? (
        <Section title="Counters / checks">
          <SpriteRow items={view.counters} onPress={(n) => navigation.push('CompetitiveDetail', { name: n, format })} showPct={false} />
        </Section>
      ) : null}
    </ScrollView>
  );
}

// Spread a todo el ancho: naturaleza + % arriba, y el reparto de EVs completo debajo.
function SpreadItem({ nature, evText, pct }: { nature: string; evText: string; pct: number }) {
  return (
    <View style={styles.spread}>
      <View style={styles.spreadTop}>
        <Text style={styles.spreadNature}>{nature}</Text>
        <Text style={styles.spreadPct}>{Math.round(pct * 100)}%</Text>
      </View>
      <Text style={styles.spreadEvs}>{evText}</Text>
      <View style={styles.spreadTrack}>
        <View style={[styles.spreadFill, { width: `${Math.min(100, pct * 100)}%` }]} />
      </View>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <Text style={styles.metaLine}>
      <Text style={styles.metaLabel}>{label}: </Text>
      {value}
    </Text>
  );
}

function SpriteRow({
  items,
  onPress,
  showPct = true,
}: {
  items: Ranked[];
  onPress: (name: string) => void;
  showPct?: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.spriteRow}>
      {items.map((it) => (
        <Pressable key={it.name} style={styles.mate} onPress={() => onPress(it.name)}>
          {it.entry ? (
            <PokeImage sources={spriteCandidates(it.entry)} style={styles.mateSprite} />
          ) : (
            <View style={styles.mateSprite} />
          )}
          <Text style={styles.mateName} numberOfLines={1}>{it.name}</Text>
          {showPct ? <Text style={styles.matePct}>{Math.round(it.pct * 100)}%</Text> : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dim: { color: colors.textDim, marginTop: 12, textAlign: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderColor: colors.border },
  sprite: { width: 96, height: 96 },
  tapHint: { color: colors.accent, fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: -4 },
  name: { color: colors.text, fontSize: 22, fontWeight: '900' },
  fmtBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  fmtBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  num: { color: colors.textDim, fontSize: 12, fontWeight: '700', marginTop: 4 },
  usage: { color: colors.accent, fontSize: 14, fontWeight: '800', marginTop: 4 },
  types: { flexDirection: 'row', marginTop: 4 },

  section: { paddingHorizontal: 16, paddingTop: 18 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  body: { color: colors.text, fontSize: 14, lineHeight: 21 },
  mt: { color: colors.textDim, fontSize: 11, fontStyle: 'italic', marginTop: 8 },

  setCard: { backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  setName: { color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 8 },
  moveLine: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginRight: 8 },
  moveText: { color: colors.text, fontSize: 14, flex: 1 },
  setMeta: { marginTop: 8, borderTopWidth: 1, borderColor: colors.border, paddingTop: 8 },
  metaLine: { color: colors.text, fontSize: 13, lineHeight: 20 },
  metaLabel: { color: colors.textDim, fontWeight: '700' },

  statRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  statLabel: { flex: 1, color: colors.text, fontSize: 13 },
  statPct: { width: 42, textAlign: 'right', color: colors.text, fontSize: 13, fontWeight: '700', marginRight: 8 },
  statTrack: { width: 90, height: 7, borderRadius: 4, backgroundColor: colors.cardAlt, overflow: 'hidden' },
  statFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },

  spread: { marginVertical: 7 },
  spreadTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spreadNature: { color: colors.text, fontSize: 14, fontWeight: '800' },
  spreadPct: { color: colors.text, fontSize: 13, fontWeight: '700' },
  spreadEvs: { color: colors.textDim, fontSize: 13, marginTop: 2, marginBottom: 5, lineHeight: 18 },
  spreadTrack: { height: 7, borderRadius: 4, backgroundColor: colors.cardAlt, overflow: 'hidden' },
  spreadFill: { height: 7, backgroundColor: colors.accent, borderRadius: 4 },

  spriteRow: { gap: 10, paddingVertical: 4, paddingRight: 8 },
  mate: { width: 72, alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingVertical: 6 },
  mateSprite: { width: 52, height: 52 },
  mateName: { color: colors.text, fontSize: 10, fontWeight: '600', textAlign: 'center', maxWidth: 66 },
  matePct: { color: colors.textDim, fontSize: 10, fontWeight: '700', marginTop: 1 },
});
