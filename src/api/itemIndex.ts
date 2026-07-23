// Índice de objetos competitivos para selección con icono (team builder).
// Reutiliza loadCompetitiveItems (cacheado + refresco diario) y ofrece:
//  - list: lista plana ordenada para el selector.
//  - byKey: mapa para resolver el icono a partir del valor guardado (nombre ES o inglés
//    del set recomendado), indexado por id normalizado de su slug y de su nombre ES.

import { toId } from '../utils';
import { loadCompetitiveItems } from './items';

export interface ItemOption {
  es: string; // nombre en español
  slug: string; // slug PokéAPI (inglés kebab)
  spritenum?: number; // posición en la hoja de iconos de Showdown
}

export interface ItemIndex {
  list: ItemOption[];
  byKey: Map<string, ItemOption>;
}

let cache: Promise<ItemIndex> | null = null;

export function loadItemIndex(): Promise<ItemIndex> {
  if (!cache) {
    cache = loadCompetitiveItems()
      .then((groups) => {
        const list: ItemOption[] = [];
        const byKey = new Map<string, ItemOption>();
        const seen = new Set<string>();
        for (const g of groups) {
          for (const it of g.items) {
            if (seen.has(it.slug)) continue;
            seen.add(it.slug);
            const opt: ItemOption = { es: it.name, slug: it.slug, spritenum: it.spritenum };
            list.push(opt);
            byKey.set(toId(it.slug), opt); // resuelve nombres en inglés (sets recomendados)
            byKey.set(toId(it.name), opt); // resuelve nombres en español (selección manual)
          }
        }
        list.sort((a, b) => a.es.localeCompare(b.es));
        return { list, byKey };
      })
      .catch((e) => {
        cache = null;
        throw e;
      });
  }
  return cache;
}

// Resuelve el objeto (icono + nombre ES) a partir del valor guardado en el set.
export const resolveItem = (idx: ItemIndex | null, stored?: string): ItemOption | undefined =>
  stored && idx ? idx.byKey.get(toId(stored)) : undefined;
