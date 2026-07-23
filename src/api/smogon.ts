// Capa competitiva (para el resumen de la Pokédex): análisis de Smogon vía data.pkmn.cc.
// Busca un overview en el tier actual y, si no hay, en National Dex / OU de gens anteriores.

import type { DexEntry, SmogonAnalysis, SmogonFormatAnalyses } from '../types';

const BASE = 'https://data.pkmn.cc/analyses';

const cache: Record<string, Promise<SmogonFormatAnalyses>> = {};

// Tier del pokedex (gen 9) -> formato de análisis.
const TIER_TO_FORMAT: Record<string, string> = {
  AG: 'gen9anythinggoes', Uber: 'gen9ubers', OU: 'gen9ou', UUBL: 'gen9ou', UU: 'gen9uu',
  RUBL: 'gen9uu', RU: 'gen9ru', NUBL: 'gen9ru', NU: 'gen9nu', PUBL: 'gen9nu', PU: 'gen9pu',
  ZUBL: 'gen9pu', ZU: 'gen9zu', LC: 'gen9lc', NFE: 'gen9nfe',
};

export function formatForTier(tier?: string): string | null {
  return (tier && TIER_TO_FORMAT[tier]) || null;
}

// Formatos (archivos pequeños) a probar como respaldo: NatDex (megas), y OU de cada gen
// anterior, para saber si el Pokémon se usó competitivamente en alguna generación.
const FALLBACK_FORMATS = [
  'gen9nationaldex', 'gen9ubers', 'gen9nfe',
  'gen8ou', 'gen7ou', 'gen6ou', 'gen5ou', 'gen4ou', 'gen3ou', 'gen2ou', 'gen1ou',
];

const SUFFIX_LABEL: Record<string, string> = {
  ou: 'OU', uu: 'UU', ru: 'RU', nu: 'NU', pu: 'PU', zu: 'ZU', ubers: 'Ubers', lc: 'LC',
  nfe: 'NFE', nationaldex: 'Nat Dex', anythinggoes: 'AG', monotype: 'Monotype', doublesou: 'Dobles',
};

function labelForFormat(fmt: string): string {
  const m = fmt.match(/^gen(\d+)(.+)$/);
  if (!m) return fmt.toUpperCase();
  return `Gen ${m[1]} · ${SUFFIX_LABEL[m[2]] ?? m[2].toUpperCase()}`;
}

function loadFormat(format: string): Promise<SmogonFormatAnalyses> {
  if (!cache[format]) {
    cache[format] = fetch(`${BASE}/${format}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`${format} ${res.status}`);
        return res.json() as Promise<SmogonFormatAnalyses>;
      })
      .catch((err) => {
        delete cache[format];
        throw err;
      });
  }
  return cache[format];
}

export interface AnalysisResult {
  label: string; // "Gen 9 · OU", "Gen 5 · OU", "Gen 9 · Nat Dex"...
  summary: string; // párrafo resumen (overview, o descripción del primer set)
  format: string; // id del formato donde se encontró (para el análisis completo)
  name: string; // nombre con el que se encontró (base para megas)
}

// Un párrafo resumen: overview si existe; si no, la descripción del primer set; si no, comments.
function pickSummary(a: SmogonAnalysis): string | null {
  if (a.overview) return a.overview;
  if (a.sets) {
    const first = Object.values(a.sets)[0];
    if (first?.description) return first.description;
  }
  if (a.comments) return a.comments;
  return null;
}

// Busca un resumen del Pokémon en el tier actual o, si no hay, en cualquier generación
// anterior. Para formas (megas/primal) usa también la especie base.
export async function getAnalysis(entry: DexEntry): Promise<AnalysisResult | null> {
  const names = entry.baseSpecies ? [entry.name, entry.baseSpecies] : [entry.name];

  const tryFormat = async (fmt: string): Promise<AnalysisResult | null> => {
    try {
      const data = await loadFormat(fmt);
      for (const nm of names) {
        const a = data[nm];
        const summary = a ? pickSummary(a) : null;
        if (summary) return { label: labelForFormat(fmt), summary, format: fmt, name: nm };
      }
    } catch {
      /* formato no disponible */
    }
    return null;
  };

  const first = formatForTier(entry.tier);
  const order = first ? [first, ...FALLBACK_FORMATS.filter((f) => f !== first)] : FALLBACK_FORMATS;
  for (const fmt of order) {
    const r = await tryFormat(fmt);
    if (r) return r;
  }
  return null;
}
