import { loadMoves } from './api/dex';
import { loadAbilitiesEs, loadItemsEs, loadMoveNamesEs } from './api/i18n';

// Naturalezas en español (oficiales).
const NATURE_ES: Record<string, string> = {
  Hardy: 'Fuerte', Lonely: 'Huraña', Brave: 'Audaz', Adamant: 'Firme', Naughty: 'Pícara',
  Bold: 'Osada', Docile: 'Dócil', Relaxed: 'Plácida', Impish: 'Agitada', Lax: 'Floja',
  Timid: 'Miedosa', Hasty: 'Activa', Serious: 'Seria', Jolly: 'Alegre', Naive: 'Ingenua',
  Modest: 'Modesta', Mild: 'Afable', Quiet: 'Mansa', Bashful: 'Tímida', Rash: 'Alocada',
  Calm: 'Serena', Gentle: 'Amable', Sassy: 'Grosera', Careful: 'Cauta', Quirky: 'Rara',
};

const TYPE_ES: Record<string, string> = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta',
  ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador',
  psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón',
  dark: 'Siniestro', steel: 'Acero', fairy: 'Hada',
};

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const slug = (s: string) =>
  s.toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function typeEs(name: string): string {
  return TYPE_ES[name.toLowerCase()] ?? name;
}

// Localizador competitivo: traduce nombres de movimiento, objeto, habilidad, naturaleza y tipo.
export interface CompLocale {
  move: (n: string) => string;
  item: (n: string) => string;
  ability: (n: string) => string;
  nature: (n: string) => string;
  type: (n: string) => string;
}

let localePromise: Promise<CompLocale> | null = null;

export function loadCompetitiveLocale(): Promise<CompLocale> {
  if (!localePromise) {
    localePromise = (async () => {
      const [moves, moveEs, abil, items] = await Promise.all([
        loadMoves(),
        loadMoveNamesEs().catch(() => new Map()),
        loadAbilitiesEs().catch(() => new Map()),
        loadItemsEs().catch(() => new Map()),
      ]);
      // Mapa id-de-movimiento -> nombre ES (los ids de moves.json ya son el toId del nombre).
      const moveMap = new Map<string, string>();
      for (const [id, m] of Object.entries(moves)) {
        const t = moveEs.get(m.num)?.name;
        if (t) moveMap.set(id, t);
      }
      const result: CompLocale = {
        move: (n: string) => moveMap.get(toId(n)) ?? n,
        item: (n: string) => items.get(slug(n)) ?? n,
        ability: (n: string) => abil.get(toId(n))?.name ?? n,
        nature: (n: string) => NATURE_ES[n] ?? n,
        type: (n: string) => typeEs(n),
      };
      return result;
    })().catch((e) => {
      localePromise = null;
      throw e;
    });
  }
  return localePromise;
}
