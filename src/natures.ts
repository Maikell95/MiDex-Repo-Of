import type { StatKey } from './types';

export interface Nature {
  name: string;
  es: string;
  plus?: StatKey;
  minus?: StatKey;
}

export const NATURES: Nature[] = [
  { name: 'Hardy', es: 'Fuerte' },
  { name: 'Lonely', es: 'Huraña', plus: 'atk', minus: 'def' },
  { name: 'Brave', es: 'Audaz', plus: 'atk', minus: 'spe' },
  { name: 'Adamant', es: 'Firme', plus: 'atk', minus: 'spa' },
  { name: 'Naughty', es: 'Pícara', plus: 'atk', minus: 'spd' },
  { name: 'Bold', es: 'Osada', plus: 'def', minus: 'atk' },
  { name: 'Docile', es: 'Dócil' },
  { name: 'Relaxed', es: 'Plácida', plus: 'def', minus: 'spe' },
  { name: 'Impish', es: 'Agitada', plus: 'def', minus: 'spa' },
  { name: 'Lax', es: 'Floja', plus: 'def', minus: 'spd' },
  { name: 'Timid', es: 'Miedosa', plus: 'spe', minus: 'atk' },
  { name: 'Hasty', es: 'Activa', plus: 'spe', minus: 'def' },
  { name: 'Serious', es: 'Seria' },
  { name: 'Jolly', es: 'Alegre', plus: 'spe', minus: 'spa' },
  { name: 'Naive', es: 'Ingenua', plus: 'spe', minus: 'spd' },
  { name: 'Modest', es: 'Modesta', plus: 'spa', minus: 'atk' },
  { name: 'Mild', es: 'Afable', plus: 'spa', minus: 'def' },
  { name: 'Quiet', es: 'Mansa', plus: 'spa', minus: 'spe' },
  { name: 'Bashful', es: 'Tímida' },
  { name: 'Rash', es: 'Alocada', plus: 'spa', minus: 'spd' },
  { name: 'Calm', es: 'Serena', plus: 'spd', minus: 'atk' },
  { name: 'Gentle', es: 'Amable', plus: 'spd', minus: 'def' },
  { name: 'Sassy', es: 'Grosera', plus: 'spd', minus: 'spe' },
  { name: 'Careful', es: 'Cauta', plus: 'spd', minus: 'spa' },
  { name: 'Quirky', es: 'Rara' },
];

const BY_NAME: Record<string, Nature> = {};
NATURES.forEach((n) => (BY_NAME[n.name] = n));

export function natureEs(name?: string): string {
  return (name && BY_NAME[name]?.es) || name || '—';
}

export function natureMult(name: string | undefined, stat: StatKey): number {
  const n = name ? BY_NAME[name] : undefined;
  if (!n) return 1;
  if (n.plus === stat) return 1.1;
  if (n.minus === stat) return 0.9;
  return 1;
}

// Estadística real a partir de base, EVs, IV (31), nivel y naturaleza.
export function calcStat(
  stat: StatKey,
  base: number,
  ev: number,
  level: number,
  nature?: string,
  iv = 31,
): number {
  const common = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
  if (stat === 'hp') {
    if (base === 1) return 1; // Shedinja
    return common + level + 10;
  }
  return Math.floor((common + 5) * natureMult(nature, stat));
}
