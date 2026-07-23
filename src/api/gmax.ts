// Datos de Gigantamax: cada Pokémon con forma G-Max, su movimiento G-Max y qué hace.
// Formas + movimiento (canGigantamax) desde Showdown; sprite desde PokéAPI.

import { GMAX_DESC } from '../gmaxReference';
import type { DexEntry } from '../types';
import { loadMoves, loadPokedex } from './dex';
import { loadFormArtIds } from './i18n';

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (s: string) =>
  s.toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Formas G-Max cuyo nombre en PokéAPI no coincide con el slug directo.
const ART_OVERRIDE: Record<string, string> = {
  'Toxtricity-Gmax': 'toxtricity-amped-gmax',
  'Urshifu-Gmax': 'urshifu-single-strike-gmax',
};

export interface GmaxInfo {
  id: string;
  entry: DexEntry; // forma Gmax (con artId para el sprite)
  pokemon: string; // nombre del Pokémon base
  moveName: string; // nombre del movimiento G-Max (inglés)
  moveType: string; // tipo del movimiento
  descEs?: string; // descripción clara en español (curada)
  descEn: string; // descripción de mecánica (inglés) como respaldo
}

let promise: Promise<GmaxInfo[]> | null = null;

export function loadGmaxList(): Promise<GmaxInfo[]> {
  if (!promise) {
    promise = Promise.all([
      loadPokedex(),
      loadMoves(),
      loadFormArtIds().catch(() => new Map<string, number>()),
    ])
      .then(([dex, moves, formArt]) => {
        const out: GmaxInfo[] = [];
        for (const [id, e] of Object.entries(dex)) {
          if (!e.forme || !e.forme.endsWith('Gmax') || !e.baseSpecies) continue;
          if (e.isNonstandard === 'CAP' || e.isNonstandard === 'Custom') continue;
          const base = dex[toId(e.baseSpecies)];
          const moveName = base?.canGigantamax ?? e.canGigantamax;
          if (!moveName) continue;
          const move = moves[toId(moveName)];
          const artId = formArt.get(ART_OVERRIDE[e.name] ?? slugify(e.name));
          out.push({
            id,
            entry: { ...e, artId },
            pokemon: e.baseSpecies,
            moveName,
            moveType: move?.type ?? '',
            descEs: GMAX_DESC[moveName],
            descEn: (move?.shortDesc || move?.desc || '').replace(/\s+/g, ' ').trim(),
          });
        }
        out.sort((a, b) => a.pokemon.localeCompare(b.pokemon));
        return out;
      })
      .catch((e) => {
        promise = null;
        throw e;
      });
  }
  return promise;
}
