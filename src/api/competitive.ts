// Capa de datos competitiva desde data.pkmn.cc (@pkmn): análisis, sets y estadísticas de uso.
// Todo cacheado por formato en memoria.

import type { DexEntry, StatKey } from '../types';
import { ALL_TYPES, defensiveMultipliers } from '../typeChart';
import { loadPokedex } from './dex';
import { loadFormArtIds } from './i18n';
import { cachedJson } from './offline';

const BASE = 'https://data.pkmn.cc';

// --- Formatos por generación (dinámicos desde el índice de data.pkmn.cc) ---
export interface FormatInfo {
  id: string;
  label: string;
}

export const GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Formatos principales a mostrar (orden) y su etiqueta.
const CORE_ORDER = ['ou', 'ubers', 'uu', 'ru', 'nu', 'pu', 'zu', 'lc', 'monotype', 'doublesou', 'nationaldex'];
const LABELS: Record<string, string> = {
  ou: 'OU', ubers: 'Ubers', uu: 'UU', ru: 'RU', nu: 'NU', pu: 'PU', zu: 'ZU',
  lc: 'LC', monotype: 'Monotype', doublesou: 'Dobles', nationaldex: 'Nat Dex',
};

// Índice de formatos con estadísticas disponibles (para no mostrar chips sin datos).
// También cacheado en disco con refresco diario (funciona offline).
function loadFormatIndex(): Promise<Set<string>> {
  return cachedJson<Record<string, unknown>>('stats/index', () =>
    fetch(`${BASE}/stats/index.json`).then((r) => {
      if (!r.ok) throw new Error(`index ${r.status}`);
      return r.json();
    }),
  ).then((obj) => new Set(Object.keys(obj).map((k) => k.replace(/\.json$/, ''))));
}

// Formatos disponibles para una generación: tiers principales + el VGC más reciente.
export async function getFormatsForGen(gen: number): Promise<FormatInfo[]> {
  const index = await loadFormatIndex().catch(() => new Set<string>());
  const has = (id: string) => index.size === 0 || index.has(id); // si falla el índice, asumimos que existen
  const out: FormatInfo[] = [];
  for (const suf of CORE_ORDER) {
    const id = `gen${gen}${suf}`;
    if (has(id)) out.push({ id, label: LABELS[suf] ?? suf.toUpperCase() });
  }
  // VGC de la temporada más reciente de la generación.
  let latest = 0;
  const re = new RegExp(`^gen${gen}vgc(\\d{4})$`);
  for (const id of index) {
    const m = id.match(re);
    if (m) latest = Math.max(latest, parseInt(m[1], 10));
  }
  if (!latest && gen === 9 && index.size === 0) latest = 2026; // fallback si no hay índice
  if (latest) out.push({ id: `gen${gen}vgc${latest}`, label: `VGC ${latest}` });
  return out;
}

// Mapa tier del pokedex -> formato por defecto.
const TIER_TO_FORMAT: Record<string, string> = {
  AG: 'gen9anythinggoes', Uber: 'gen9ubers', OU: 'gen9ou', UUBL: 'gen9ou', UU: 'gen9uu',
  RUBL: 'gen9uu', RU: 'gen9ru', NUBL: 'gen9ru', NU: 'gen9nu', PUBL: 'gen9nu', PU: 'gen9pu',
  ZUBL: 'gen9pu', ZU: 'gen9zu', LC: 'gen9lc',
};
export function defaultFormatForTier(tier?: string): string {
  return (tier && TIER_TO_FORMAT[tier]) || 'gen9ou';
}

// Etiqueta legible de un id de formato, p. ej. "gen9nationaldex" -> "Gen 9 · Nat Dex".
const SUFFIX_LABEL: Record<string, string> = {
  ou: 'OU', uu: 'UU', ru: 'RU', nu: 'NU', pu: 'PU', zu: 'ZU', ubers: 'Ubers', lc: 'LC',
  nfe: 'NFE', monotype: 'Monotype', doublesou: 'Dobles OU', nationaldex: 'Nat Dex',
  anythinggoes: 'AG', battlestadiumsingles: 'BSS', '1v1': '1v1',
};
export function formatLabel(id: string): string {
  const m = id.match(/^gen(\d+)(.+)$/);
  if (!m) return id;
  const suf = m[2];
  const base = SUFFIX_LABEL[suf] ?? (suf.startsWith('vgc') ? `VGC ${suf.slice(3)}` : suf.toUpperCase());
  return `Gen ${m[1]} · ${base}`;
}

// --- Tipos ---
export interface CompSet {
  moves: (string | string[])[];
  ability?: string;
  item?: string | string[];
  nature?: string | string[];
  evs?: Partial<Record<StatKey, number>>;
  ivs?: Partial<Record<StatKey, number>>;
  teratypes?: string | string[];
  level?: number;
}
export type PokemonSets = Record<string, CompSet>;

export interface UsageStat {
  usage: { weighted: number; raw: number; real: number };
  count: number;
  viability?: number[];
  abilities: Record<string, number>;
  items: Record<string, number>;
  teraTypes: Record<string, number>;
  spreads: Record<string, number>;
  moves: Record<string, number>;
  teammates: Record<string, number>;
  counters: Record<string, number[]>;
}
export interface FormatStats {
  battles: number;
  pokemon: Record<string, UsageStat>;
}

// --- Fetch + cache por formato ---
// Caché persistente en disco con refresco diario automático (offline-friendly).
function loadJson<T>(kind: string, format: string): Promise<T> {
  const key = `${kind}/${format}`;
  return cachedJson<T>(key, () =>
    fetch(`${BASE}/${key}.json`).then((r) => {
      if (!r.ok) throw new Error(`${key} ${r.status}`);
      return r.json();
    }),
  );
}

export const loadAnalyses = (fmt: string) =>
  loadJson<Record<string, { overview?: string; comments?: string; sets?: Record<string, { description?: string }> }>>('analyses', fmt);
export const loadSets = (fmt: string) => loadJson<Record<string, PokemonSets>>('sets', fmt);
export const loadStats = (fmt: string) => loadJson<FormatStats>('stats', fmt);

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (s: string) =>
  s.toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Asigna el artId (sprite propio) a las formas, para que regionales/megas no usen el del base.
function withArt(entry: DexEntry, formArt: Map<string, number>): DexEntry {
  if (!entry.baseSpecies) return entry;
  const s = slugify(entry.name);
  const artId =
    formArt.get(s) ??
    formArt.get(`${s}-breed`) ??
    formArt.get(`${s}-standard`) ??
    formArt.get(`${s}-mask`);
  return { ...entry, artId };
}

// Resolver de Pokémon por nombre con su sprite correcto (artId). Carga pokedex + form art una vez.
export type EntryResolver = (name: string) => DexEntry | undefined;
export async function loadEntryResolver(): Promise<EntryResolver> {
  const [dex, formArt] = await Promise.all([
    loadPokedex(),
    loadFormArtIds().catch(() => new Map<string, number>()),
  ]);
  return (name: string) => {
    const e = dex[toId(name)];
    return e ? withArt(e, formArt) : undefined;
  };
}

// Pokémon (DexEntry) por su nombre de display, con sprite correcto.
export async function entryByName(name: string): Promise<DexEntry | undefined> {
  const resolve = await loadEntryResolver();
  return resolve(name);
}

// Ranking de uso de un formato: lista ordenada por uso descendente.
export interface RankedMon {
  name: string;
  usage: number; // 0..1 (weighted)
  entry?: DexEntry;
}
export async function getUsageRanking(format: string): Promise<RankedMon[]> {
  const [stats, resolve] = await Promise.all([loadStats(format), loadEntryResolver()]);
  const list: RankedMon[] = Object.entries(stats.pokemon).map(([name, s]) => ({
    name,
    usage: s.usage?.weighted ?? 0,
    entry: resolve(name),
  }));
  return list.sort((a, b) => b.usage - a.usage);
}

// Arma un equipo competitivo analizando los ~50 Pokémon más usados del tier. En cada paso
// elige el que mejor CUBRE las amenazas del meta (usando los datos de counters), sumando
// sinergia (teammates), penalizando debilidades de tipo apiladas y favoreciendo el uso.
// Además, al añadir un Pokémon, sus propios counters pasan a ser amenazas a cubrir
// ("counters sobre counters"), para maximizar la cobertura real.
export async function autoTeam(format: string, currentNames: string[]): Promise<string[]> {
  const [stats, resolve] = await Promise.all([loadStats(format), loadEntryResolver()]);
  const pokes = stats.pokemon;

  const usageOf = (n: string) => pokes[n]?.usage?.weighted ?? 0;
  const countersOf = (n: string) => Object.keys(pokes[n]?.counters ?? {}); // Pokémon que lo vencen
  const teammatesOf = (n: string) => pokes[n]?.teammates ?? {};
  const typesOf = (n: string) => resolve(n)?.types ?? [];

  // Pool: los 50 más usados que resuelven a una entrada (necesitamos sus tipos).
  const sorted = Object.entries(pokes).sort((a, b) => (b[1].usage?.weighted ?? 0) - (a[1].usage?.weighted ?? 0));
  const pool = sorted.filter(([n]) => resolve(n)).slice(0, 50).map(([n]) => n);

  const team = currentNames.filter((n) => resolve(n));

  // Amenazas a cubrir: top 20 por uso (peso = uso). Se ampliará con los counters de cada pick.
  const threats = new Map<string, number>();
  for (const [n] of sorted.slice(0, 20)) threats.set(n, usageOf(n));
  const covered = new Set<string>();

  const onAdd = (mon: string) => {
    // Marca como cubiertas las amenazas que este Pokémon vence.
    for (const T of threats.keys()) if (!covered.has(T) && countersOf(T).includes(mon)) covered.add(T);
    // Sus propios counters se vuelven nuevas amenazas (counters sobre counters).
    for (const K of countersOf(mon)) if (!threats.has(K)) threats.set(K, usageOf(K) || 0.03);
  };
  team.forEach(onAdd);

  // Cuenta cuántos miembros son débiles a cada tipo (para no apilar debilidades).
  const weakCounts = () => {
    const c: Record<string, number> = {};
    for (const m of team) {
      const mult = defensiveMultipliers(typesOf(m));
      for (const t of ALL_TYPES) if (mult[t] >= 2) c[t] = (c[t] ?? 0) + 1;
    }
    return c;
  };

  while (team.length < 6) {
    const wc = weakCounts();
    let best: string | null = null;
    let bestScore = -Infinity;
    for (const C of pool) {
      if (team.includes(C)) continue;
      let score = usageOf(C) * 10; // viabilidad base
      for (const [T, w] of threats) if (!covered.has(T) && countersOf(T).includes(C)) score += w * 120;
      for (const m of team) score += (teammatesOf(m)[C] ?? 0) * 20; // sinergia
      const mult = defensiveMultipliers(typesOf(C));
      for (const t of ALL_TYPES) if (mult[t] >= 2) score -= (wc[t] ?? 0) * 8; // penaliza apilar debilidad
      if (score > bestScore) {
        bestScore = score;
        best = C;
      }
    }
    if (!best) break;
    team.push(best);
    onAdd(best);
  }
  return team;
}

// Datos competitivos completos de un Pokémon en un formato.
export interface CompetitiveData {
  overview?: string;
  setDescriptions?: Record<string, string>;
  sets?: PokemonSets;
  stat?: UsageStat;
}
export async function getCompetitive(name: string, format: string): Promise<CompetitiveData> {
  const [analyses, sets, stats] = await Promise.all([
    loadAnalyses(format).catch(() => ({})),
    loadSets(format).catch(() => ({})),
    loadStats(format).catch(() => ({ battles: 0, pokemon: {} } as FormatStats)),
  ]);
  const a = (analyses as Record<string, { overview?: string; sets?: Record<string, { description?: string }> }>)[name];
  const setDescriptions: Record<string, string> = {};
  if (a?.sets) for (const [k, v] of Object.entries(a.sets)) if (v.description) setDescriptions[k] = v.description;
  return {
    overview: a?.overview,
    setDescriptions,
    sets: (sets as Record<string, PokemonSets>)[name],
    stat: (stats as FormatStats).pokemon?.[name],
  };
}
