// Tipos de datos que consumimos desde Pokémon Showdown y Smogon (data.pkmn.cc).

export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

export type BaseStats = Record<StatKey, number>;

// Entrada de pokedex.json de Showdown
export interface DexEntry {
  num: number;
  name: string;
  types: string[];
  baseStats: BaseStats;
  abilities: Record<string, string>; // { "0": "Overgrow", "1": "...", "H": "Chlorophyll" }
  heightm?: number;
  weightkg?: number;
  color?: string;
  eggGroups?: string[];
  evos?: string[];
  prevo?: string;
  tier?: string; // "OU", "UU", "RU", "NU", "PU", "ZU", "Uber", "LC", "NFE", "Illegal"...
  baseSpecies?: string; // presente solo en formas alternativas
  forme?: string;
  gen?: number;
  isNonstandard?: string; // "Past" (oficial), "Future"/"CAP" (no oficial), etc.
  canGigantamax?: string; // nombre del movimiento G-Max (en la especie base)
  // Datos de evolución (presentes en la etapa evolucionada, describen cómo evoluciona desde prevo)
  evoType?: string; // 'trade' | 'useItem' | 'levelFriendship' | 'levelHold' | 'levelMove' | 'levelExtra' | 'other'
  evoLevel?: number;
  evoItem?: string;
  evoCondition?: string;
  evoMove?: string;
  // Id de PokéAPI para el sprite/artwork. Para especies base coincide con `num`;
  // para megaevoluciones es el id de la forma (p. ej. 10033 = Venusaur-Mega).
  artId?: number;
}

// pokedex.json completo: id (slug) -> entrada
export type Pokedex = Record<string, DexEntry>;

// Entrada de moves.json de Showdown
export interface MoveEntry {
  num: number;
  name: string;
  type: string;
  category: 'Physical' | 'Special' | 'Status';
  basePower: number;
  accuracy: number | true;
  pp: number;
  priority: number;
  multihit?: number | [number, number]; // golpes fijos o rango [min, max]
  desc?: string;
  shortDesc?: string;
}

export type Moves = Record<string, MoveEntry>; // id de movimiento -> entrada

// Entrada de learnsets.json de Showdown
export interface LearnsetEntry {
  learnset?: Record<string, string[]>; // id de movimiento -> ["9L1", "9M", "9E"...]
}

export type Learnsets = Record<string, LearnsetEntry>;

// Entrada de abilities.json de Showdown
export interface AbilityEntry {
  num: number;
  name: string;
  desc?: string;
  shortDesc?: string;
  rating?: number;
}

export type Abilities = Record<string, AbilityEntry>;

// Movimiento aprendido ya "resuelto" para mostrar en la UI
export interface LearnedMove {
  id: string;
  move: MoveEntry;
  nameEs: string; // nombre del movimiento en español (o el inglés si no hay traducción)
  descEs?: string; // descripción del movimiento en español
  method: 'level' | 'machine' | 'tutor' | 'egg' | 'other';
  level?: number;
  gen: number;
}

// --- Datos competitivos de Smogon (data.pkmn.cc/analyses/<format>.json) ---

export interface SmogonSet {
  description?: string;
}

export interface SmogonAnalysis {
  overview?: string;
  comments?: string;
  sets?: Record<string, SmogonSet>;
}

export type SmogonFormatAnalyses = Record<string, SmogonAnalysis>; // Name -> análisis
