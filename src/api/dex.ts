// Capa de datos "dex": descarga los JSON estáticos de Pokémon Showdown una sola vez
// y los cachea en memoria. Un solo fetch por archivo cubre TODAS las generaciones.

import type { DexEntry, Learnsets, LearnedMove, Moves, Pokedex } from '../types';
import { describeEvolution } from '../evoText';
import { loadFormArtIds, loadMoveNamesEs } from './i18n';
import { offlineJson } from './offline';

// Una forma es oficial si no es CAP (Create-A-Pokémon de Smogon) ni Custom.
// OJO: "Past" = megas de gen 6/7; "Future" = megas nuevas de Pokémon Legends: Z-A.
// Ambas son oficiales; solo excluimos las fan-made (CAP/Custom).
function isStandardForme(e: DexEntry): boolean {
  const ns = e.isNonstandard;
  return ns !== 'CAP' && ns !== 'Custom';
}

const BASE = 'https://play.pokemonshowdown.com/data';

// Cache de promesas: cada dataset se resuelve una sola vez por sesión.
let pokedexPromise: Promise<Pokedex> | null = null;
let movesPromise: Promise<Moves> | null = null;
let learnsetsPromise: Promise<Learnsets> | null = null;

const fetchSD = <T>(file: string) => async (): Promise<T> => {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`Error ${res.status} al cargar ${file}`);
  return (await res.json()) as T;
};

// Datos empaquetados (offline) + caché con refresco automático cuando hay internet.
export function loadPokedex(): Promise<Pokedex> {
  if (!pokedexPromise)
    pokedexPromise = offlineJson<Pokedex>(
      'pokedex',
      () => require('../../assets/data/pokedex.json'),
      fetchSD<Pokedex>('pokedex.json'),
    );
  return pokedexPromise;
}

export function loadMoves(): Promise<Moves> {
  if (!movesPromise)
    movesPromise = offlineJson<Moves>(
      'moves',
      () => require('../../assets/data/moves.json'),
      fetchSD<Moves>('moves.json'),
    );
  return movesPromise;
}

export function loadLearnsets(): Promise<Learnsets> {
  if (!learnsetsPromise)
    learnsetsPromise = offlineJson<Learnsets>(
      'learnsets',
      () => require('../../assets/data/learnsets.json'),
      fetchSD<Learnsets>('learnsets.json'),
    );
  return learnsetsPromise;
}

const REGIONS = ['Alola', 'Galar', 'Hisui', 'Paldea'];

function isMega(forme?: string): boolean {
  return !!forme?.startsWith('Mega');
}

// Otras formas de combate relevantes (ni mega ni regional): baseSpecies -> formes incluidas.
// Ampliable para más Pokémon con formas alternativas.
const OTHER_FORMES: Record<string, string[]> = {
  Ogerpon: ['Wellspring', 'Hearthflame', 'Cornerstone'],
  Kyogre: ['Primal'],
  Groudon: ['Primal'],
};
function isOtherForme(baseSpecies?: string, forme?: string): boolean {
  const list = OTHER_FORMES[baseSpecies ?? ''];
  return !!list && !!forme && list.includes(forme);
}
function isGmax(forme?: string): boolean {
  return !!forme && forme.endsWith('Gmax');
}
// Solo variantes regionales "reales": la región exacta (Alola/Galar/Hisui/Paldea) o las
// formas Paldea de Tauros (Paldea-Combat/Blaze/Aqua). Excluye modos de batalla (Galar-Zen)
// y Totems (Alola-Totem), que llevan la región como prefijo pero no son variantes regionales.
function isRegional(forme?: string): boolean {
  if (!forme) return false;
  return REGIONS.includes(forme) || forme.startsWith('Paldea-');
}

// Overrides de sprite para formas cuyo nombre en PokéAPI no coincide con el slug directo.
const FORME_ART_OVERRIDE: Record<string, string> = {
  'Toxtricity-Gmax': 'toxtricity-amped-gmax',
  'Urshifu-Gmax': 'urshifu-single-strike-gmax',
};

// Convierte un nombre de Showdown al slug de PokéAPI (quita apóstrofes y puntos).
// "Farfetch’d-Galar" -> "farfetchd-galar", "Mr. Mime-Galar" -> "mr-mime-galar".
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Formas de género: Showdown usa -F/-M; PokéAPI usa -female/-male (también en megas,
// p. ej. "meowstic-f-mega" -> "meowstic-female-mega"). Corrige Basculegion-F, Indeedee-F, etc.
function genderArtKey(s: string): string {
  return s.replace(/(^|-)f(?=-|$)/, '$1female').replace(/(^|-)m(?=-|$)/, '$1male');
}

// Lista de especies ordenadas por número de Pokédex. Incluye las megaevoluciones y
// las formas regionales justo DESPUÉS de su Pokémon base, con su `artId` (sprite correcto).
export async function loadSpeciesList(): Promise<Array<[string, DexEntry]>> {
  const dex = await loadPokedex();
  const formArt = await loadFormArtIds().catch(() => new Map<string, number>());

  // Especies base (sin baseSpecies) ordenadas por número.
  const bases = Object.entries(dex)
    .filter(([, e]) => e.num > 0 && !e.baseSpecies)
    .sort((a, b) => a[1].num - b[1].num);

  // Busca el id de sprite de PokéAPI para una forma. Fallbacks: "-breed" (Tauros de Paldea),
  // "-standard" (Darmanitan de Galar) y "-mask" (máscaras de Ogerpon).
  const artFor = (name: string): number | undefined => {
    const override = FORME_ART_OVERRIDE[name];
    if (override && formArt.has(override)) return formArt.get(override);
    const s = slugify(name);
    return (
      formArt.get(s) ??
      formArt.get(genderArtKey(s)) ??
      formArt.get(`${s}-breed`) ??
      formArt.get(`${s}-standard`) ??
      formArt.get(`${s}-mask`)
    );
  };

  // Agrupamos megas, regionales y otras formas de combate por nombre de su especie base.
  const formesByBase = new Map<string, Array<[string, DexEntry]>>();
  for (const [id, e] of Object.entries(dex)) {
    if (!e.baseSpecies) continue;
    const mega = isMega(e.forme);
    const regional = isRegional(e.forme);
    const other = isOtherForme(e.baseSpecies, e.forme) || isGmax(e.forme);
    if (!mega && !regional && !other) continue;
    // Excluimos megas fan-made (Future) y CAP; solo las oficiales (Past).
    if (!isStandardForme(e)) continue;
    // El Pikachu "regional" es en realidad el Pikachu con gorra (cosmético), no hay Alolan real.
    if (regional && e.baseSpecies === 'Pikachu') continue;
    const withArt: DexEntry = { ...e, artId: artFor(e.name) };
    const list = formesByBase.get(e.baseSpecies) ?? [];
    list.push([id, withArt]);
    formesByBase.set(e.baseSpecies, list);
  }

  // Orden dentro de un base: primero megas, luego regionales; alfabético dentro de cada grupo.
  const formeRank = (forme?: string) => (isMega(forme) ? 0 : 1);

  // Construimos la lista final: base seguido de sus formas.
  const result: Array<[string, DexEntry]> = [];
  for (const [id, e] of bases) {
    result.push([id, { ...e, artId: e.num }]);
    const formes = formesByBase.get(e.name);
    if (formes) {
      formes.sort((a, b) => {
        const r = formeRank(a[1].forme) - formeRank(b[1].forme);
        return r !== 0 ? r : (a[1].forme ?? '').localeCompare(b[1].forme ?? '');
      });
      result.push(...formes);
    }
  }
  return result;
}

// --- Línea evolutiva (a partir de evos/prevo de Showdown) ---
export interface EvoNode {
  id: string;
  entry: DexEntry;
  method?: string; // cómo evoluciona desde su etapa previa (o "Megaevolución")
}

const evoId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

// Devuelve las etapas de la línea evolutiva (base -> ... -> final -> megas) y el id del actual.
// Soporta ramas (Eevee), formas regionales y añade las megaevoluciones como etapa final.
export async function getEvolutionStages(
  entry: DexEntry,
): Promise<{ stages: EvoNode[][]; currentId: string }> {
  const dex = await loadPokedex();
  const formArt = await loadFormArtIds().catch(() => new Map<string, number>());

  // Id de sprite para una forma (misma lógica que la lista: slug + fallbacks).
  const artFor = (name: string): number | undefined => {
    const s = name.toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return formArt.get(s) ?? formArt.get(genderArtKey(s)) ?? formArt.get(`${s}-breed`) ?? formArt.get(`${s}-standard`);
  };

  // Crea un nodo; a las formas (baseSpecies) les asigna su artId para el sprite correcto
  // y a las etapas evolucionadas su descripción de cómo evolucionan.
  const nodeFor = (name: string): EvoNode | undefined => {
    const id = evoId(name);
    const e = dex[id];
    if (!e) return undefined;
    const entry = e.baseSpecies ? { ...e, artId: artFor(e.name) } : e;
    return { id, entry, method: describeEvolution(e) || undefined };
  };

  const currentId = evoId(entry.name);

  // Si es una forma sin línea propia (p. ej. una mega), partimos de la especie base.
  let start = entry;
  if (entry.baseSpecies && !entry.prevo && !(entry.evos?.length)) {
    start = dex[evoId(entry.baseSpecies)] ?? entry;
  }

  // Subimos hasta la raíz de la línea.
  let root: EvoNode = nodeFor(start.name) ?? { id: evoId(start.name), entry: start };
  const guard = new Set<string>();
  while (root.entry.prevo && !guard.has(root.id)) {
    guard.add(root.id);
    const prev = nodeFor(root.entry.prevo);
    if (!prev) break;
    root = prev;
  }

  // Recorremos hacia abajo por etapas (soporta ramas como Eevee).
  const stages: EvoNode[][] = [];
  const seen = new Set<string>();
  let cur: EvoNode[] = [root];
  while (cur.length) {
    const layer = cur.filter((n) => !seen.has(n.id));
    if (!layer.length) break;
    layer.forEach((n) => seen.add(n.id));
    stages.push(layer);
    const next: EvoNode[] = [];
    for (const n of layer) {
      for (const evoName of n.entry.evos ?? []) {
        const evo = nodeFor(evoName);
        if (evo && !seen.has(evo.id)) next.push(evo);
      }
    }
    cur = next;
  }

  // Etapa extra con las megaevoluciones OFICIALES de cualquier especie de la línea.
  const megasByBase = new Map<string, EvoNode[]>();
  for (const [mid, me] of Object.entries(dex)) {
    if (me.baseSpecies && me.forme?.startsWith('Mega') && isStandardForme(me)) {
      const arr = megasByBase.get(me.baseSpecies) ?? [];
      arr.push({ id: mid, entry: { ...me, artId: artFor(me.name) }, method: 'Megaevolución' });
      megasByBase.set(me.baseSpecies, arr);
    }
  }
  const megaStage: EvoNode[] = [];
  for (const layer of stages) {
    for (const n of layer) {
      const megas = megasByBase.get(n.entry.name);
      if (megas) {
        megas.sort((a, b) => (a.entry.forme ?? '').localeCompare(b.entry.forme ?? ''));
        megaStage.push(...megas);
      }
    }
  }
  if (megaStage.length) stages.push(megaStage);

  return { stages, currentId };
}

// Convierte el código fuente de learnset ("9L1", "8M", "7E"...) a algo mostrable.
function parseSource(code: string): { method: LearnedMove['method']; level?: number; gen: number } {
  const gen = parseInt(code[0], 10) || 0;
  const method = code[1];
  switch (method) {
    case 'L':
      return { method: 'level', level: parseInt(code.slice(2), 10) || 0, gen };
    case 'M':
      return { method: 'machine', gen };
    case 'T':
      return { method: 'tutor', gen };
    case 'E':
      return { method: 'egg', gen };
    default:
      return { method: 'other', gen };
  }
}

// Learnset COMPLETO fusionando la cadena de preevoluciones (Showdown solo lista los
// movimientos propios de cada etapa; los heredados están en las prevos). moveId -> fuentes.
async function mergedLearnset(entry: DexEntry): Promise<Record<string, string[]>> {
  const [learnsets, dex] = await Promise.all([loadLearnsets(), loadPokedex()]);
  const merged: Record<string, string[]> = {};
  const guard = new Set<string>();
  let cur: DexEntry | undefined = entry;
  while (cur) {
    const cid = evoId(cur.name);
    if (guard.has(cid)) break;
    guard.add(cid);
    const baseId = cur.baseSpecies ? evoId(cur.baseSpecies) : cid;
    const ls = learnsets[cid]?.learnset ?? learnsets[baseId]?.learnset;
    if (ls) for (const [mv, src] of Object.entries(ls)) merged[mv] = merged[mv] ? merged[mv].concat(src) : src;
    cur = cur.prevo ? dex[evoId(cur.prevo)] : undefined;
  }
  return merged;
}

// Conjunto de ids de movimientos que un Pokémon puede aprender (cadena completa).
export async function getMovePool(entry: DexEntry): Promise<Set<string>> {
  return new Set(Object.keys(await mergedLearnset(entry)));
}

// Devuelve los movimientos que aprende (con datos del movimiento), incluyendo los heredados.
export async function getLearnedMoves(id: string, entry: DexEntry): Promise<LearnedMove[]> {
  const [ls, moves, moveNamesEs] = await Promise.all([
    mergedLearnset(entry),
    loadMoves(),
    loadMoveNamesEs().catch(() => new Map<number, import('./i18n').MoveEs>()), // si falla, en inglés
  ]);

  const result: LearnedMove[] = [];
  for (const [moveId, sources] of Object.entries(ls)) {
    const move = moves[moveId];
    if (!move) continue;
    // Elegimos la fuente de la generación más alta (la más "actual").
    let best = parseSource(sources[0]);
    for (const s of sources) {
      const p = parseSource(s);
      if (p.gen > best.gen) best = p;
    }
    const es = moveNamesEs.get(move.num);
    const nameEs = es?.name ?? move.name;
    result.push({
      id: moveId,
      move,
      nameEs,
      descEs: es?.desc,
      method: best.method,
      level: best.level,
      gen: best.gen,
    });
  }

  // Orden: primero por nivel (los de subida de nivel), luego alfabético.
  return result.sort((a, b) => {
    const la = a.method === 'level' ? a.level ?? 0 : 9999;
    const lb = b.method === 'level' ? b.level ?? 0 : 9999;
    if (la !== lb) return la - lb;
    return a.nameEs.localeCompare(b.nameEs);
  });
}
