// Referencia de objetos competitivos: nombre + descripción en español (con fallback a inglés)
// desde PokéAPI, y minisprite desde la hoja de iconos de Pokémon Showdown (cubre TODOS los objetos).

import { cachedJson } from './offline';

const GRAPHQL = 'https://graphql.pokeapi.co/v1beta2';

// --- Hoja de iconos de Showdown (16 columnas x 48 filas de 24px) ---
export const ITEM_SHEET = 'https://play.pokemonshowdown.com/sprites/itemicons-sheet.png';
export const ITEM_SHEET_W = 384;
export const ITEM_SHEET_H = 1152;
export const ITEM_ICON = 24;
export const ITEM_COLS = 16;

// Sprite del objeto en PokéAPI (fallback para los que no están en la hoja de Showdown).
export function itemSpriteUrl(slug: string): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
}

// Grupos de objetos de combate. Cada grupo puede agrupar varias categorías de PokéAPI
// (p. ej. todas las bayas). Etiqueta larga (cabecera) + corta (chip).
const GROUPS: Array<{ label: string; short: string; ids: string[] }> = [
  { label: 'Objetos equipables', short: 'Equipables', ids: ['held-items'] },
  { label: 'Objetos Elección', short: 'Elección', ids: ['choice'] },
  { label: 'Orbes / objetos de estado', short: 'Orbes', ids: ['bad-held-items'] },
  { label: 'Potenciadores de tipo', short: 'Pot. tipo', ids: ['type-enhancement'] },
  { label: 'Específicos de especie', short: 'Especie', ids: ['species-specific'] },
  {
    label: 'Bayas',
    short: 'Bayas',
    ids: ['medicine', 'picky-healing', 'in-a-pinch', 'type-protection', 'other'],
  },
  { label: 'Tablas', short: 'Tablas', ids: ['plates'] },
  { label: 'Discos recuerdo', short: 'Discos', ids: ['memories'] },
  { label: 'Gemas', short: 'Gemas', ids: ['jewels'] },
];

// Objetos Origen (categoría "gameplay", junto a objetos no-combate): se añaden por nombre
// y se muestran en "Específicos de especie".
const EXTRA_ITEMS = ['adamant-crystal', 'lustrous-globe', 'griseous-core'];
const EXTRA_GROUP = 'Específicos de especie';

export interface ItemInfo {
  name: string;
  desc: string;
  slug: string;
  spritenum?: number; // posición en la hoja de Showdown
}
export interface ItemGroup {
  label: string;
  short: string;
  items: ItemInfo[];
}

function titleCase(slug: string): string {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Parsea items.js de Showdown: por cada objeto, su spritenum (hoja) y su desc
// (descripción de mecánica oficial en inglés, cubre prácticamente todos los objetos).
export interface ShowdownItems {
  sprite: Map<string, number>;
  desc: Map<string, string>;
}
let showdownPromise: Promise<ShowdownItems> | null = null;
function loadShowdownItems(): Promise<ShowdownItems> {
  if (!showdownPromise) {
    showdownPromise = fetch('https://play.pokemonshowdown.com/data/items.js')
      .then((r) => r.text())
      .then((txt) => {
        // Segmentamos por el inicio de cada objeto (`id:{name:"`), robusto al minificado.
        const starts: Array<{ id: string; pos: number }> = [];
        const re = /([a-z0-9]+):\{name:"/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(txt))) starts.push({ id: m[1], pos: m.index });

        const sprite = new Map<string, number>();
        const desc = new Map<string, string>();
        for (let i = 0; i < starts.length; i++) {
          const seg = txt.slice(starts[i].pos, i + 1 < starts.length ? starts[i + 1].pos : txt.length);
          const s = seg.match(/spritenum:(\d+)/);
          if (s) sprite.set(starts[i].id, parseInt(s[1], 10));
          const d = seg.match(/desc:("(?:[^"\\]|\\.)*")/);
          if (d) {
            try {
              desc.set(starts[i].id, JSON.parse(d[1]));
            } catch {
              /* ignora desc mal formada */
            }
          }
        }
        return { sprite, desc };
      })
      .catch((e) => {
        showdownPromise = null;
        throw e;
      });
  }
  return showdownPromise;
}

interface RawItem {
  name: string;
  itemcategory: { name: string };
  itemnames: Array<{ name: string }>;
  es: Array<{ flavor_text: string }>;
  enf: Array<{ flavor_text: string }>;
  en: Array<{ short_effect: string }>;
}

export function loadCompetitiveItems(): Promise<ItemGroup[]> {
  // Caché persistente + refresco diario en segundo plano (funciona offline).
  return cachedJson<ItemGroup[]>('items/competitive', () => {
    const cats = GROUPS.flatMap((g) => g.ids);
    const query = `query {
      item(where: {_or: [
        {itemcategory: {name: {_in: ${JSON.stringify(cats)}}}},
        {name: {_in: ${JSON.stringify(EXTRA_ITEMS)}}}
      ]}, limit: 700) {
        name
        itemcategory { name }
        itemnames(where: {language: {name: {_eq: "es"}}}) { name }
        es: itemflavortexts(where: {language: {name: {_eq: "es"}}}, order_by: {version_group_id: desc}, limit: 1) { flavor_text }
        enf: itemflavortexts(where: {language: {name: {_eq: "en"}}}, order_by: {version_group_id: desc}, limit: 1) { flavor_text }
        en: itemeffecttexts(where: {language: {name: {_eq: "en"}}}) { short_effect }
      }
    }`;
    return Promise.all([
      fetch(GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      }).then((r) => {
        if (!r.ok) throw new Error(`items ${r.status}`);
        return r.json();
      }),
      loadShowdownItems().catch(() => ({ sprite: new Map(), desc: new Map() }) as ShowdownItems),
    ]).then(([json, showdown]) => {
      const items: RawItem[] = json.data.item;
      // Mapa categoría PokéAPI -> etiqueta de grupo.
      const catToGroup = new Map<string, string>();
      for (const g of GROUPS) for (const id of g.ids) catToGroup.set(id, g.label);

      const byGroup = new Map<string, ItemInfo[]>();
      for (const it of items) {
        const id = toId(it.name);
        const group =
          catToGroup.get(it.itemcategory.name) ??
          (EXTRA_ITEMS.includes(it.name) ? EXTRA_GROUP : undefined);
        if (!group) continue;
        const name = it.itemnames[0]?.name ?? titleCase(it.name);
        // Prioridad: español (PokéAPI) -> mecánica oficial de Showdown (EN) -> efecto/flavor EN.
        const desc =
          it.es[0]?.flavor_text?.replace(/\s*\n\s*/g, ' ').trim() ||
          showdown.desc.get(id) ||
          it.en[0]?.short_effect?.replace(/\s+/g, ' ').trim() ||
          it.enf[0]?.flavor_text?.replace(/\s*\n\s*/g, ' ').trim() ||
          'Sin descripción disponible.';
        const arr = byGroup.get(group) ?? [];
        arr.push({ name, desc, slug: it.name, spritenum: showdown.sprite.get(id) });
        byGroup.set(group, arr);
      }
      const groups: ItemGroup[] = [];
      for (const g of GROUPS) {
        const arr = byGroup.get(g.label);
        if (arr && arr.length) {
          arr.sort((a, b) => a.name.localeCompare(b.name));
          groups.push({ label: g.label, short: g.short, items: arr });
        }
      }
      return groups;
    });
  });
}
