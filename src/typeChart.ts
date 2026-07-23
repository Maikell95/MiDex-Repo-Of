import { TERA } from './teraChart';

export const ALL_TYPES = Object.keys(TERA); // 18 tipos

// Multiplicador defensivo por cada tipo atacante contra un Pokémon de estos tipos.
// (x4/x2 débil, x1 neutro, x0.5/x0.25 resiste, x0 inmune).
export function defensiveMultipliers(types: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const atk of ALL_TYPES) {
    let mult = 1;
    for (const def of types) {
      const p = TERA[def.toLowerCase()];
      if (!p) continue;
      if (p.weak.includes(atk)) mult *= 2;
      else if (p.res.includes(atk)) mult *= 0.5;
      else if (p.immTo.includes(atk)) mult *= 0;
    }
    out[atk] = mult;
  }
  return out;
}

export interface TeamTypeStat {
  type: string;
  weak: number; // miembros con x2 o más
  resist: number; // miembros con menos de x1 (resisten o inmunes)
}

// Resumen por tipo atacante para un equipo (lista de tipos por miembro).
export function teamTypeAnalysis(members: string[][]): TeamTypeStat[] {
  const stats: TeamTypeStat[] = ALL_TYPES.map((type) => ({ type, weak: 0, resist: 0 }));
  const index: Record<string, TeamTypeStat> = {};
  stats.forEach((s) => (index[s.type] = s));
  for (const types of members) {
    const mult = defensiveMultipliers(types);
    for (const atk of ALL_TYPES) {
      if (mult[atk] >= 2) index[atk].weak += 1;
      else if (mult[atk] < 1) index[atk].resist += 1;
    }
  }
  return stats;
}
