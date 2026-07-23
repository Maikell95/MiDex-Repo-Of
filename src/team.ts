import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DexEntry, StatKey } from './types';

export interface MoveRef {
  id: string;
  name: string; // nombre localizado
  type: string;
}

// Set competitivo de un miembro (para stats reales y análisis).
export interface MemberSet {
  moves: (MoveRef | null)[]; // 4
  evs: Partial<Record<StatKey, number>>;
  ivs: Partial<Record<StatKey, number>>; // sin valor = 31
  nature?: string;
  item?: string;
  ability?: string;
  tera?: string;
  level: number;
}

export interface TeamMember {
  id: string;
  entry: DexEntry;
  set?: MemberSet;
}

export function defaultSet(): MemberSet {
  return { moves: [null, null, null, null], evs: {}, ivs: {}, nature: 'Hardy', level: 100 };
}

// Movimientos de control de campo (id de Showdown → etiqueta ES). Compartidos entre el
// team-builder (análisis de control de campo) y el editor de miembro (dedupe al aplicar set).
export const HAZARD_SETTERS: Array<[string, string]> = [
  ['stealthrock', 'Trampa Rocas'],
  ['spikes', 'Púas'],
  ['toxicspikes', 'Púas Tóxicas'],
  ['stickyweb', 'Red Viscosa'],
];
export const HAZARD_REMOVAL: Array<[string, string]> = [
  ['rapidspin', 'Giro Rápido'],
  ['defog', 'Despejar'],
  ['mortalspin', 'Giro Mortal'],
  ['tidyup', 'Limpieza'],
];
export const HAZARD_SETTER_IDS = new Set(HAZARD_SETTERS.map(([id]) => id));
export const HAZARD_REMOVAL_IDS = new Set(HAZARD_REMOVAL.map(([id]) => id));
export interface SavedTeam {
  id: string;
  name: string;
  format: string; // formato/tier asociado (para sugerencias y auto-armado)
  level: number; // nivel de todo el equipo (para las estadísticas reales)
  members: TeamMember[];
}

const KEY = 'pkdx.teams';

export async function loadTeams(): Promise<SavedTeam[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedTeam[]) : [];
  } catch {
    return [];
  }
}

async function persist(teams: SavedTeam[]): Promise<SavedTeam[]> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(teams));
  } catch {
    /* ignora */
  }
  return teams;
}

export async function getTeam(id: string): Promise<SavedTeam | undefined> {
  return (await loadTeams()).find((t) => t.id === id);
}

// Inserta o actualiza un equipo (por id) y devuelve la lista resultante.
export async function upsertTeam(team: SavedTeam): Promise<SavedTeam[]> {
  const teams = await loadTeams();
  const i = teams.findIndex((t) => t.id === team.id);
  if (i >= 0) teams[i] = team;
  else teams.push(team);
  return persist(teams);
}

export async function deleteTeam(id: string): Promise<SavedTeam[]> {
  const teams = (await loadTeams()).filter((t) => t.id !== id);
  return persist(teams);
}

let counter = 0;
export function newTeam(format = 'gen9ou'): SavedTeam {
  counter += 1;
  return { id: `${Date.now().toString(36)}${counter}`, name: 'Equipo nuevo', format, level: 100, members: [] };
}
