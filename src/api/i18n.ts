// Traducciones al español (movimientos, habilidades, objetos) y ids de sprites de formas.
// Datos EMPAQUETADOS (offline) con refresco automático desde PokéAPI/Showdown cuando hay red.

import { offlineJson } from './offline';

const GRAPHQL = 'https://graphql.pokeapi.co/v1beta2';

async function gql<T>(query: string): Promise<T> {
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors));
  return json.data as T;
}

const norm = (name: string) => name.replace(/-/g, '');
const clean = (s?: string) => (s ? s.replace(/\s*\n\s*/g, ' ').trim() : undefined);

// --- Movimientos: número -> { nombre, descripción } en español ---
export interface MoveEs {
  name: string;
  desc?: string;
}

async function freshMoveNames(): Promise<Record<string, MoveEs>> {
  const d = await gql<{
    move: Array<{
      id: number;
      movenames: Array<{ name: string }>;
      moveflavortexts: Array<{ flavor_text: string }>;
    }>;
  }>(`query {
    move(limit: 2000) {
      id
      movenames(where: {language: {name: {_eq: "es"}}}) { name }
      moveflavortexts(where: {language: {name: {_eq: "es"}}}, limit: 1, order_by: {version_group_id: desc}) { flavor_text }
    }
  }`);
  const out: Record<string, MoveEs> = {};
  for (const m of d.move) {
    const name = m.movenames[0]?.name;
    if (name) out[m.id] = { name, desc: clean(m.moveflavortexts[0]?.flavor_text) };
  }
  return out;
}

let moveNamesPromise: Promise<Map<number, MoveEs>> | null = null;
export function loadMoveNamesEs(): Promise<Map<number, MoveEs>> {
  if (!moveNamesPromise) {
    moveNamesPromise = offlineJson<Record<string, MoveEs>>(
      'moveNamesEs',
      () => require('../../assets/data/moveNamesEs.json'),
      freshMoveNames,
    ).then((obj) => {
      const map = new Map<number, MoveEs>();
      for (const [num, v] of Object.entries(obj)) map.set(Number(num), v);
      return map;
    });
  }
  return moveNamesPromise;
}

// --- Objetos: slug PokéAPI -> nombre en español ---
async function freshItems(): Promise<Record<string, string>> {
  const d = await gql<{ item: Array<{ name: string; itemnames: Array<{ name: string }> }> }>(`query {
    item(limit: 3000) {
      name
      itemnames(where: {language: {name: {_eq: "es"}}}) { name }
    }
  }`);
  const out: Record<string, string> = {};
  for (const it of d.item) {
    const es = it.itemnames[0]?.name;
    if (es) out[it.name] = es;
  }
  return out;
}

let itemsEsPromise: Promise<Map<string, string>> | null = null;
export function loadItemsEs(): Promise<Map<string, string>> {
  if (!itemsEsPromise) {
    itemsEsPromise = offlineJson<Record<string, string>>(
      'itemsEs',
      () => require('../../assets/data/itemsEs.json'),
      freshItems,
    ).then((obj) => new Map(Object.entries(obj)));
  }
  return itemsEsPromise;
}

// --- Formas alternativas: nombre (minúsculas) -> id de PokéAPI (para el sprite) ---
async function freshFormArt(): Promise<Record<string, number>> {
  const d = await gql<{ pokemon: Array<{ id: number; name: string }> }>(`query {
    pokemon(where: {is_default: {_eq: false}}, limit: 2000) { id name }
  }`);
  const out: Record<string, number> = {};
  for (const p of d.pokemon) out[p.name.toLowerCase()] = p.id;
  return out;
}

let formArtPromise: Promise<Map<string, number>> | null = null;
export function loadFormArtIds(): Promise<Map<string, number>> {
  if (!formArtPromise) {
    formArtPromise = offlineJson<Record<string, number>>(
      'formArt',
      () => require('../../assets/data/formArt.json'),
      freshFormArt,
    ).then((obj) => new Map(Object.entries(obj).map(([k, v]) => [k, Number(v)])));
  }
  return formArtPromise;
}

// --- EVs que otorga cada Pokémon al derrotarlo (por nº de Pokédex) ---
async function freshEvYield(): Promise<Record<string, Record<string, number>>> {
  const d = await gql<{
    pokemon: Array<{ id: number; pokemonstats: Array<{ stat_id: number; effort: number }> }>;
  }>(`query {
    pokemon(where: {id: {_lte: 1025}, is_default: {_eq: true}}, limit: 2000) {
      id
      pokemonstats { stat_id effort }
    }
  }`);
  const STAT: Record<number, string> = { 1: 'hp', 2: 'atk', 3: 'def', 4: 'spa', 5: 'spd', 6: 'spe' };
  const out: Record<string, Record<string, number>> = {};
  for (const p of d.pokemon) {
    const y: Record<string, number> = {};
    for (const s of p.pokemonstats) if (s.effort > 0 && STAT[s.stat_id]) y[STAT[s.stat_id]] = s.effort;
    if (Object.keys(y).length) out[p.id] = y;
  }
  return out;
}

let evYieldPromise: Promise<Map<number, Record<string, number>>> | null = null;
export function loadEvYield(): Promise<Map<number, Record<string, number>>> {
  if (!evYieldPromise) {
    evYieldPromise = offlineJson<Record<string, Record<string, number>>>(
      'evYield',
      () => require('../../assets/data/evYield.json'),
      freshEvYield,
    ).then((obj) => new Map(Object.entries(obj).map(([k, v]) => [Number(k), v])));
  }
  return evYieldPromise;
}

// --- Habilidades: id Showdown -> { nombre, flavor es, efecto preciso en } ---
export interface AbilityEs {
  name: string;
  flavorEs?: string;
  effectEn?: string;
}

function extractAbilityDesc(txt: string, id: string): string | undefined {
  let i = txt.indexOf(`,${id}:{`);
  if (i < 0) i = txt.indexOf(`{${id}:{`);
  if (i < 0) return undefined;
  const seg = txt.slice(i, i + 3000);
  const m = seg.match(/shortDesc:"((?:[^"\\]|\\.)*)"/) || seg.match(/desc:"((?:[^"\\]|\\.)*)"/);
  if (!m) return undefined;
  try {
    return JSON.parse(`"${m[1]}"`);
  } catch {
    return m[1];
  }
}

// Habilidades nuevas de las megas de Leyendas Z-A ("Future"): PokéAPI no las tiene, así
// que las aportamos aquí para que no queden sin descripción (ni al refrescar los datos).
const FUTURE_ABILITIES_ES: Record<string, AbilityEs> = {
  dragonize: { name: 'Dragonize', flavorEs: 'Convierte los movimientos de tipo Normal de este Pokémon en tipo Dragón y aumenta su potencia ×1,2.' },
  eelevate: { name: 'Eelevate', flavorEs: 'Inmuniza a este Pokémon contra los ataques de tipo Tierra (y contra Púas, Púas Tóxicas, Red Viscosa y Trampa Arena). Además, cuando debilita a un rival, sube 1 nivel su mejor característica.' },
  firemane: { name: 'Fire Mane', flavorEs: 'Multiplica ×1,5 la característica ofensiva de este Pokémon cuando usa un ataque de tipo Fuego.' },
  megasol: { name: 'Mega Sol', flavorEs: 'Los movimientos de este Pokémon actúan como si el sol (Día Soleado) estuviera activo.' },
  piercingdrill: { name: 'Piercing Drill', flavorEs: 'Los movimientos de contacto de este Pokémon ignoran la protección del objetivo, pero infligen 1/4 del daño habitual.' },
  spicyspray: { name: 'Spicy Spray', flavorEs: 'Si este Pokémon recibe un ataque, el atacante sufre quemadura.' },
};

async function freshAbilities(): Promise<Record<string, AbilityEs>> {
  const [d, sdText] = await Promise.all([
    gql<{
      ability: Array<{
        name: string;
        abilitynames: Array<{ name: string }>;
        abilityflavortexts: Array<{ flavor_text: string }>;
        abilityeffecttexts: Array<{ short_effect: string }>;
      }>;
    }>(`query {
      ability(limit: 500, where: {is_main_series: {_eq: true}}) {
        name
        abilitynames(where: {language: {name: {_eq: "es"}}}) { name }
        abilityflavortexts(where: {language: {name: {_eq: "es"}}}, limit: 1, order_by: {version_group_id: desc}) { flavor_text }
        abilityeffecttexts(where: {language: {name: {_eq: "en"}}}) { short_effect }
      }
    }`),
    fetch('https://play.pokemonshowdown.com/data/abilities.js').then((r) => r.text()).catch(() => ''),
  ]);
  const out: Record<string, AbilityEs> = {};
  for (const a of d.ability) {
    const name = a.abilitynames[0]?.name;
    if (!name) continue;
    const id = norm(a.name);
    const effectEn = clean(a.abilityeffecttexts[0]?.short_effect) || (sdText ? extractAbilityDesc(sdText, id) : undefined);
    out[id] = { name, flavorEs: clean(a.abilityflavortexts[0]?.flavor_text), effectEn };
  }
  return { ...FUTURE_ABILITIES_ES, ...out }; // las Future primero; PokéAPI puede sobrescribir si coincide
}

let abilityEsPromise: Promise<Map<string, AbilityEs>> | null = null;
export function loadAbilitiesEs(): Promise<Map<string, AbilityEs>> {
  if (!abilityEsPromise) {
    const bundled = require('../../assets/data/abilitiesEs.json') as Record<string, AbilityEs>;
    abilityEsPromise = offlineJson<Record<string, AbilityEs>>('abilitiesEs', () => bundled, freshAbilities)
      // Fusionamos los datos empaquetados como respaldo: la caché/fresh gana, pero el
      // bundle rellena lo que falte (p. ej. una caché vieja sin las habilidades nuevas).
      .then((obj) => new Map(Object.entries({ ...bundled, ...obj })));
  }
  return abilityEsPromise;
}
