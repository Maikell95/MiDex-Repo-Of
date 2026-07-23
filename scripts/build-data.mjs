// Genera los datos no-competitivos empaquetados (offline) en assets/data/.
// Ejecutar: node scripts/build-data.mjs
// Fuentes: Pokémon Showdown (pokedex/moves/learnsets, items.js/abilities.js) y PokéAPI (español).

import { mkdir, writeFile } from 'node:fs/promises';

const OUT = new URL('../assets/data/', import.meta.url);
const UA = { 'User-Agent': 'Mozilla/5.0 pkdx-build' };
const GRAPHQL = 'https://graphql.pokeapi.co/v1beta2';

async function getJson(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.text();
}
async function gql(query) {
  const r = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...UA },
    body: JSON.stringify({ query }),
  });
  const j = await r.json();
  if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors));
  return j.data;
}
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (s) => (s ? s.replace(/\s*\n\s*/g, ' ').trim() : undefined);

async function main() {
  await mkdir(OUT, { recursive: true });
  const SD = 'https://play.pokemonshowdown.com/data';

  console.log('Descargando Showdown (pokedex/moves/learnsets)…');
  const [pokedex, moves, learnsets] = await Promise.all([
    getJson(`${SD}/pokedex.json`),
    getJson(`${SD}/moves.json`),
    getJson(`${SD}/learnsets.json`),
  ]);
  // Correcciones a errores conocidos de los datos de Showdown (verificados contra PokéAPI,
  // datos oficiales del juego). Ver scripts/check-egg-groups.mjs.
  const EGG_GROUP_FIX = {
    toedscool: ['Grass'],
    toedscruel: ['Grass'],
  };
  for (const [id, groups] of Object.entries(EGG_GROUP_FIX)) {
    if (pokedex[id]) pokedex[id].eggGroups = groups;
  }
  await writeFile(new URL('pokedex.json', OUT), JSON.stringify(pokedex));
  await writeFile(new URL('moves.json', OUT), JSON.stringify(moves));
  await writeFile(new URL('learnsets.json', OUT), JSON.stringify(learnsets));

  console.log('Nombres de movimientos (es)…');
  const md = await gql(`query {
    move(limit: 2000) {
      id
      movenames(where: {language: {name: {_eq: "es"}}}) { name }
      moveflavortexts(where: {language: {name: {_eq: "es"}}}, limit: 1, order_by: {version_group_id: desc}) { flavor_text }
    }
  }`);
  const moveNamesEs = {};
  for (const m of md.move) {
    const name = m.movenames[0]?.name;
    if (!name) continue;
    moveNamesEs[m.id] = { name, desc: clean(m.moveflavortexts[0]?.flavor_text) };
  }
  await writeFile(new URL('moveNamesEs.json', OUT), JSON.stringify(moveNamesEs));

  console.log('Habilidades (es + efecto)…');
  const [ad, abilJs] = await Promise.all([
    gql(`query {
      ability(limit: 500, where: {is_main_series: {_eq: true}}) {
        name
        abilitynames(where: {language: {name: {_eq: "es"}}}) { name }
        abilityflavortexts(where: {language: {name: {_eq: "es"}}}, limit: 1, order_by: {version_group_id: desc}) { flavor_text }
        abilityeffecttexts(where: {language: {name: {_eq: "en"}}}) { short_effect }
      }
    }`),
    getText(`${SD}/abilities.js`),
  ]);
  const extractAbility = (id) => {
    let i = abilJs.indexOf(`,${id}:{`);
    if (i < 0) i = abilJs.indexOf(`{${id}:{`);
    if (i < 0) return undefined;
    const seg = abilJs.slice(i, i + 3000);
    const m = seg.match(/shortDesc:"((?:[^"\\]|\\.)*)"/) || seg.match(/desc:"((?:[^"\\]|\\.)*)"/);
    if (!m) return undefined;
    try { return JSON.parse(`"${m[1]}"`); } catch { return m[1]; }
  };
  // Habilidades nuevas de las megas de Leyendas Z-A ("Future"): PokéAPI no las tiene.
  const FUTURE_ABILITIES_ES = {
    dragonize: { name: 'Dragonize', flavorEs: 'Convierte los movimientos de tipo Normal de este Pokémon en tipo Dragón y aumenta su potencia ×1,2.' },
    eelevate: { name: 'Eelevate', flavorEs: 'Inmuniza a este Pokémon contra los ataques de tipo Tierra (y contra Púas, Púas Tóxicas, Red Viscosa y Trampa Arena). Además, cuando debilita a un rival, sube 1 nivel su mejor característica.' },
    firemane: { name: 'Fire Mane', flavorEs: 'Multiplica ×1,5 la característica ofensiva de este Pokémon cuando usa un ataque de tipo Fuego.' },
    megasol: { name: 'Mega Sol', flavorEs: 'Los movimientos de este Pokémon actúan como si el sol (Día Soleado) estuviera activo.' },
    piercingdrill: { name: 'Piercing Drill', flavorEs: 'Los movimientos de contacto de este Pokémon ignoran la protección del objetivo, pero infligen 1/4 del daño habitual.' },
    spicyspray: { name: 'Spicy Spray', flavorEs: 'Si este Pokémon recibe un ataque, el atacante sufre quemadura.' },
  };
  const abilitiesEs = { ...FUTURE_ABILITIES_ES };
  for (const a of ad.ability) {
    const name = a.abilitynames[0]?.name;
    if (!name) continue;
    const id = norm(a.name);
    const effectEn = clean(a.abilityeffecttexts[0]?.short_effect) || extractAbility(id);
    abilitiesEs[id] = { name, flavorEs: clean(a.abilityflavortexts[0]?.flavor_text), effectEn };
  }
  await writeFile(new URL('abilitiesEs.json', OUT), JSON.stringify(abilitiesEs));

  console.log('Objetos (es)…');
  const itd = await gql(`query {
    item(limit: 3000) {
      name
      itemnames(where: {language: {name: {_eq: "es"}}}) { name }
    }
  }`);
  const itemsEs = {};
  for (const it of itd.item) {
    const es = it.itemnames[0]?.name;
    if (es) itemsEs[it.name] = es;
  }
  await writeFile(new URL('itemsEs.json', OUT), JSON.stringify(itemsEs));

  console.log('Ids de sprites de formas…');
  const fd = await gql(`query { pokemon(where: {is_default: {_eq: false}}, limit: 2000) { id name } }`);
  const formArt = {};
  for (const p of fd.pokemon) formArt[p.name.toLowerCase()] = p.id;
  await writeFile(new URL('formArt.json', OUT), JSON.stringify(formArt));

  console.log('EVs que otorga (EV yield)…');
  const evd = await gql(`query {
    pokemon(where: {id: {_lte: 1025}, is_default: {_eq: true}}, limit: 2000) {
      id
      pokemonstats { stat_id effort }
    }
  }`);
  const STAT = { 1: 'hp', 2: 'atk', 3: 'def', 4: 'spa', 5: 'spd', 6: 'spe' };
  const evYield = {};
  for (const p of evd.pokemon) {
    const y = {};
    for (const s of p.pokemonstats) if (s.effort > 0 && STAT[s.stat_id]) y[STAT[s.stat_id]] = s.effort;
    if (Object.keys(y).length) evYield[p.id] = y;
  }
  await writeFile(new URL('evYield.json', OUT), JSON.stringify(evYield));

  console.log('Listo. Archivos en assets/data/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
