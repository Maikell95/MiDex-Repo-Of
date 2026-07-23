// Cruza los grupos huevo de Showdown (pokedex.json) contra PokéAPI (autoritativo)
// y lista las discrepancias. Solo diagnóstico; no modifica datos.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dex = require('../assets/data/pokedex.json');

const GRAPHQL = 'https://graphql.pokeapi.co/v1beta2';
async function gql(q) {
  const r = await fetch(GRAPHQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

// PokéAPI usa nombres antiguos; los normalizamos a los de Showdown.
const API_TO_SD = {
  monster: 'Monster', water1: 'Water 1', water2: 'Water 2', water3: 'Water 3',
  bug: 'Bug', flying: 'Flying', ground: 'Field', fairy: 'Fairy', plant: 'Grass',
  humanshape: 'Human-Like', mineral: 'Mineral', indeterminate: 'Amorphous',
  ditto: 'Ditto', dragon: 'Dragon', 'no-eggs': 'Undiscovered',
};

const norm = (arr) => [...(arr || [])].map((g) => g.trim()).sort().join(' + ');

const d = await gql(`query {
  pokemonspecies(limit: 2000, order_by: {id: asc}) {
    name id
    pokemonegggroups { egggroup { name } }
  }
}`);

// Mapa por nombre PokéAPI-slug de especie -> grupos (formato Showdown).
const apiBySlug = new Map();
for (const s of d.pokemonspecies) {
  const groups = s.pokemonegggroups.map((g) => API_TO_SD[g.egggroup.name] ?? g.egggroup.name);
  apiBySlug.set(s.name, groups);
}

// Showdown usa claves sin guiones (ej. "nidoran-f" -> "nidoranf"); PokéAPI usa slugs con guion.
// Construimos un índice tolerante: quitamos todo lo no alfanumérico.
const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const apiByClean = new Map();
for (const [slug, groups] of apiBySlug) apiByClean.set(clean(slug), groups);

let mismatches = 0;
let missing = 0;
const rows = [];
for (const [key, e] of Object.entries(dex)) {
  if (!e.eggGroups || !e.eggGroups.length) continue;
  // Solo especies base (sin forme) para el cruce 1:1 con PokéAPI-species.
  if (e.forme || e.baseSpecies) continue;
  const api = apiByClean.get(clean(e.name)) || apiByClean.get(clean(key));
  if (!api) { missing++; continue; }
  if (norm(e.eggGroups) !== norm(api)) {
    mismatches++;
    rows.push(`${e.name.padEnd(16)} SD: ${JSON.stringify(e.eggGroups).padEnd(30)} API: ${JSON.stringify(api)}`);
  }
}

console.log(`Discrepancias: ${mismatches}  (sin match en API: ${missing})`);
console.log(rows.join('\n'));
