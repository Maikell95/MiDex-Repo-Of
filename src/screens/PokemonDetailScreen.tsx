import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { smoothLayout } from '../anim';
import { defaultFormatForTier } from '../api/competitive';
import { getEvolutionStages, getLearnedMoves, type EvoNode } from '../api/dex';
import { loadAbilitiesEs, loadEvYield, type AbilityEs } from '../api/i18n';
import { getAnalysis } from '../api/smogon';
import { translateEs } from '../api/translate';
import ArtworkCarousel from '../components/ArtworkCarousel';
import Chevron from '../components/Chevron';
import EvolutionLine from '../components/EvolutionLine';
import FadeInView from '../components/FadeInView';
import StatBar from '../components/StatBar';
import TypeScatterBackground from '../components/TypeScatterBackground';
import TierBadge from '../components/TierBadge';
import TypeBadge from '../components/TypeBadge';
import type { RootStackParamList } from '../navigation';
import { colors, tierColor, typeColor } from '../theme';
import type { LearnedMove } from '../types';
import { abilityList, dexNumber, statTotal, toId } from '../utils';
import { STAT_ORDER } from '../utils';

// Nota: en la New Architecture (Fabric) LayoutAnimation ya está activo por defecto,
// no hace falta setLayoutAnimationEnabledExperimental.

type Props = NativeStackScreenProps<RootStackParamList, 'Detalle'>;

const METHOD_LABEL: Record<LearnedMove['method'], string> = {
  level: 'Nivel',
  machine: 'MT',
  tutor: 'Tutor',
  egg: 'Huevo',
  other: '—',
};

const CATEGORY_LABEL: Record<string, string> = {
  Physical: 'Físico',
  Special: 'Especial',
  Status: 'Estado',
};

const EGG_GROUP_ES: Record<string, string> = {
  Monster: 'Monstruo', 'Water 1': 'Agua 1', 'Water 2': 'Agua 2', 'Water 3': 'Agua 3',
  Bug: 'Bicho', Flying: 'Volador', Field: 'Campo', Fairy: 'Hada', Grass: 'Planta',
  'Human-Like': 'Humanoide', Mineral: 'Mineral', Amorphous: 'Amorfo', Ditto: 'Ditto',
  Dragon: 'Dragón', Undiscovered: 'Desconocido',
};
const EV_SHORT: Record<string, string> = { hp: 'PS', atk: 'Ataque', def: 'Defensa', spa: 'At. Esp.', spd: 'Def. Esp.', spe: 'Velocidad' };
const EV_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

// Resumen competitivo (un solo párrafo) ya traducido para la Pokédex.
interface CompText {
  label: string;
  overview: string;
  format: string; // formato donde se encontró (para el análisis completo)
  name: string; // nombre con el que se encontró (base para megas)
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// Los textos de Smogon traen etiquetas <em>, saltos, etc. Los limpiamos antes de traducir.
function stripTags(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export default function PokemonDetailScreen({ route, navigation }: Props) {
  const { id, entry } = route.params;

  const [abilitiesEs, setAbilitiesEs] = useState<Map<string, AbilityEs> | null>(null);
  const [abilityEffects, setAbilityEffects] = useState<Record<string, string>>({}); // efecto preciso traducido
  const [evYield, setEvYield] = useState<Record<string, number> | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedMove, setExpandedMove] = useState<string | null>(null);
  const [moves, setMoves] = useState<LearnedMove[] | null>(null);
  const [evo, setEvo] = useState<{ stages: EvoNode[][]; currentId: string } | null>(null);
  const [comp, setComp] = useState<CompText | null>(null);
  const [compLoading, setCompLoading] = useState(true);

  useEffect(() => {
    // Habilidades: mostramos la CONDICIÓN EXACTA (short_effect de PokéAPI, preciso)
    // traducida al español. Si no hay efecto preciso, usamos el texto de juego (flavor).
    loadAbilitiesEs()
      .then(async (map) => {
        setAbilitiesEs(map);
        const out: Record<string, string> = {};
        await Promise.all(
          abilityList(entry).map(async ({ name }) => {
            const key = toId(name);
            const info = map.get(key);
            if (info?.effectEn) out[key] = await translateEs(info.effectEn);
            else if (info?.flavorEs) out[key] = info.flavorEs;
          }),
        );
        setAbilityEffects(out);
      })
      .catch(() => setAbilitiesEs(new Map()));
    getLearnedMoves(id, entry).then(setMoves).catch(() => setMoves([]));
    getEvolutionStages(entry).then(setEvo).catch(() => setEvo(null));
    loadEvYield().then((m) => setEvYield(m.get(entry.num) ?? {})).catch(() => setEvYield({}));

    // Resumen competitivo: solo el overview (un párrafo), traducido. El resto va en el
    // apartado Competitivo completo.
    (async () => {
      try {
        const res = await getAnalysis(entry);
        if (res) {
          const overview = await translateEs(stripTags(res.summary));
          setComp({ label: res.label, overview, format: res.format, name: res.name });
        } else {
          setComp(null);
        }
      } catch {
        setComp(null);
      } finally {
        setCompLoading(false);
      }
    })();
  }, [id]);

  const total = statTotal(entry);

  function toggleAbility(key: string) {
    smoothLayout();
    setExpanded((cur) => (cur === key ? null : key));
  }

  function toggleMove(key: string) {
    smoothLayout();
    setExpandedMove((cur) => (cur === key ? null : key));
  }

  return (
    <TypeScatterBackground types={entry.types}>
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Cabecera */}
      <View style={[styles.header, { backgroundColor: typeColor(entry.types[0]) + '22' }]}>
        <View style={styles.headerTop}>
          <Text style={styles.num}>{dexNumber(entry.num)}</Text>
          <TierBadge tier={entry.tier} />
        </View>
        <ArtworkCarousel entry={entry} />
        <Text style={styles.name}>{entry.name}</Text>
        <View style={styles.types}>
          {entry.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </View>
      </View>

      {/* Ficha rápida */}
      <View style={styles.quick}>
        {entry.heightm != null && <Quick label="Altura" value={`${entry.heightm} m`} />}
        {entry.weightkg != null && <Quick label="Peso" value={`${entry.weightkg} kg`} />}
        {entry.gen != null && <Quick label="Gen" value={`${entry.gen}`} />}
        <Quick label="Total base" value={`${total}`} />
      </View>

      {/* Grupo huevo + EVs que otorga */}
      {(entry.eggGroups?.length || (evYield && Object.keys(evYield).length)) ? (
        <View style={styles.bio}>
          {entry.eggGroups?.length ? (
            <View style={styles.bioRow}>
              <Text style={styles.bioLabel}>Grupo huevo</Text>
              <Text style={styles.bioValue}>
                {entry.eggGroups.map((g) => EGG_GROUP_ES[g] ?? g).join(' · ')}
              </Text>
            </View>
          ) : null}
          {evYield && Object.keys(evYield).length ? (
            <View style={styles.bioRow}>
              <Text style={styles.bioLabel}>EVs al derrotarlo</Text>
              <Text style={styles.bioValue}>
                {EV_ORDER.filter((k) => evYield[k]).map((k) => `${evYield[k]} ${EV_SHORT[k]}`).join(' · ')}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Línea evolutiva */}
      {evo && evo.stages.flat().length > 1 ? (
        <Section title="Línea evolutiva">
          <EvolutionLine
            stages={evo.stages}
            currentId={evo.currentId}
            onSelect={(nid, nentry) => navigation.push('Detalle', { id: nid, entry: nentry })}
          />
        </Section>
      ) : null}

      {/* Estadísticas */}
      <Section title="Estadísticas base">
        {STAT_ORDER.map((k) => (
          <StatBar key={k} statKey={k} value={entry.baseStats[k]} />
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total}</Text>
        </View>
      </Section>

      {/* Habilidades (clicables: muestran qué hacen) */}
      <Section title="Habilidades">
        {abilityList(entry).map(({ name, hidden }) => {
          const key = toId(name);
          const es = abilitiesEs?.get(key);
          const displayName = es?.name ?? name;
          const isOpen = expanded === key;
          const effect = abilityEffects[key];
          const ready = abilitiesEs !== null; // ya cargaron las habilidades
          return (
            <Pressable
              key={name}
              style={[styles.ability, isOpen && styles.abilityOpen]}
              onPress={() => toggleAbility(key)}
            >
              <View style={styles.abilityHead}>
                <Text style={styles.abilityName}>{displayName}</Text>
                {hidden && <Text style={styles.hidden}>OCULTA</Text>}
                <Chevron open={isOpen} />
              </View>
              {isOpen ? (
                <FadeInView>
                  {effect ? (
                    <Text style={styles.abilityDesc}>{effect}</Text>
                  ) : ready ? (
                    <Text style={styles.abilityDesc}>Sin descripción disponible.</Text>
                  ) : (
                    <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />
                  )}
                </FadeInView>
              ) : null}
            </Pressable>
          );
        })}
      </Section>

      {/* Resumen competitivo (Smogon, traducido) */}
      <Section title="Resumen competitivo">
        <Pressable
          style={styles.compLink}
          onPress={() =>
            (navigation as any).navigate('CompetitivoTab', {
              screen: 'CompetitiveDetail',
              initial: false, // deja la lista "Meta" debajo para poder volver a ella
              params: comp
                ? { name: entry.name, format: comp.format }
                : { name: entry.name, format: defaultFormatForTier(entry.tier) },
            })
          }
        >
          <Text style={styles.compLinkText}>Ver análisis competitivo completo</Text>
          <Text style={styles.compLinkArrow}>→</Text>
        </Pressable>
        {compLoading ? (
          <View style={styles.compLoading}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.dim}>Cargando y traduciendo análisis…</Text>
          </View>
        ) : comp ? (
          <View>
            <View style={[styles.formatTag, { borderColor: tierColor(entry.tier) }]}>
              <Text style={[styles.formatTagText, { color: tierColor(entry.tier) }]}>{comp.label}</Text>
            </View>
            <Text style={styles.body}>{comp.overview}</Text>
            <Text style={styles.mtNote}>Traducción automática (EN→ES).</Text>
          </View>
        ) : null}
      </Section>

      {/* Movimientos (clicables: muestran qué hacen) */}
      <Section title={`Movimientos que aprende${moves ? ` (${moves.length})` : ''}`}>
        {!moves ? (
          <ActivityIndicator color={colors.accent} />
        ) : moves.length === 0 ? (
          <Text style={styles.dim}>Sin datos de movimientos.</Text>
        ) : (
          <>
            {moves.map((m) => {
              const isOpen = expandedMove === m.id;
              const acc = m.move.accuracy === true ? '—' : `${m.move.accuracy}%`;
              return (
                <Pressable key={m.id} onPress={() => toggleMove(m.id)} style={styles.moveItem}>
                  <View style={styles.moveRow}>
                    <View style={[styles.moveType, { backgroundColor: typeColor(m.move.type) }]} />
                    <Text style={styles.moveName} numberOfLines={1}>{m.nameEs}</Text>
                    <Text style={styles.moveMethod}>
                      {METHOD_LABEL[m.method]}
                      {m.method === 'level' && m.level ? ` ${m.level}` : ''}
                    </Text>
                    <Text style={styles.movePower}>
                      {m.move.category === 'Status' ? '—' : m.move.basePower || '—'}
                    </Text>
                  </View>
                  {isOpen ? (
                    <FadeInView style={styles.moveDetail}>
                      <View style={styles.moveTags}>
                        <TypeBadge type={m.move.type} small />
                        <View style={styles.moveTag}>
                          <Text style={styles.moveTagText}>
                            {CATEGORY_LABEL[m.move.category] ?? m.move.category}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.moveStatsRow}>
                        <MoveStat label="Potencia" value={m.move.category === 'Status' ? '—' : `${m.move.basePower || '—'}`} />
                        <MoveStat label="Precisión" value={acc} />
                        <MoveStat label="PP" value={`${m.move.pp}`} />
                        {m.move.priority !== 0 && <MoveStat label="Prioridad" value={`${m.move.priority > 0 ? '+' : ''}${m.move.priority}`} />}
                      </View>
                      <Text style={styles.moveDesc}>
                        {m.descEs ?? m.move.shortDesc ?? 'Sin descripción disponible.'}
                      </Text>
                    </FadeInView>
                  ) : null}
                </Pressable>
              );
            })}
          </>
        )}
      </Section>
    </ScrollView>
    </TypeScatterBackground>
  );
}

function Quick({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.quickItem}>
      <Text style={styles.quickValue}>{value}</Text>
      <Text style={styles.quickLabel}>{label}</Text>
    </View>
  );
}

function MoveStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.moveStat}>
      <Text style={styles.moveStatValue}>{value}</Text>
      <Text style={styles.moveStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { alignItems: 'center', paddingTop: 12, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, alignItems: 'center' },
  num: { color: colors.textDim, fontWeight: '800', fontSize: 15 },
  name: { color: colors.text, fontSize: 26, fontWeight: '900' },
  types: { flexDirection: 'row', marginTop: 6 },

  quick: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border },
  quickItem: { alignItems: 'center' },
  quickValue: { color: colors.text, fontSize: 16, fontWeight: '800' },
  quickLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },

  bio: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, gap: 8 },
  bioRow: { flexDirection: 'row', alignItems: 'center' },
  bioLabel: { color: colors.textDim, fontSize: 13, fontWeight: '800', width: 120 },
  bioValue: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },

  section: { paddingHorizontal: 16, paddingTop: 18 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 },

  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, alignItems: 'center' },
  totalLabel: { color: colors.textDim, marginRight: 10, fontWeight: '700' },
  totalValue: { color: colors.text, fontWeight: '900', fontSize: 16 },

  ability: { backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  abilityOpen: { borderColor: colors.accent },
  abilityHead: { flexDirection: 'row', alignItems: 'center' },
  abilityName: { color: colors.text, fontWeight: '800', fontSize: 15, flex: 1 },
  hidden: { color: colors.accent, fontSize: 10, fontWeight: '800', marginLeft: 8, letterSpacing: 0.5 },
  abilityDesc: { color: colors.textDim, marginTop: 8, fontSize: 13, lineHeight: 19 },

  compLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accent + '22',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  compLinkText: { color: colors.accent, fontWeight: '800', fontSize: 14 },
  compLinkArrow: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  formatTag: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 10 },
  formatTagText: { fontWeight: '800', fontSize: 12 },
  body: { color: colors.text, fontSize: 14, lineHeight: 21 },
  set: { marginTop: 14, borderLeftWidth: 3, borderColor: colors.accent, paddingLeft: 10 },
  setName: { color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 4 },
  mtNote: { color: colors.textDim, fontSize: 11, fontStyle: 'italic', marginTop: 12 },
  dim: { color: colors.textDim, fontSize: 13, lineHeight: 19 },

  moveItem: { borderBottomWidth: 1, borderColor: colors.border },
  moveRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  moveType: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  moveName: { color: colors.text, flex: 1, fontSize: 14, fontWeight: '600' },
  moveMethod: { color: colors.textDim, width: 70, fontSize: 12, textAlign: 'right' },
  movePower: { color: colors.text, width: 44, fontSize: 13, textAlign: 'right', fontWeight: '700' },
  moveDetail: { backgroundColor: colors.cardAlt, borderRadius: 10, padding: 12, marginBottom: 10 },
  moveTags: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  moveTag: { backgroundColor: colors.border, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  moveTagText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  moveStatsRow: { flexDirection: 'row', marginBottom: 10 },
  moveStat: { marginRight: 22 },
  moveStatValue: { color: colors.text, fontSize: 15, fontWeight: '800' },
  moveStatLabel: { color: colors.textDim, fontSize: 11, marginTop: 1 },
  moveDesc: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
});
