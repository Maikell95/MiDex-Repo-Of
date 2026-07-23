import type { DexEntry } from './types';

// Stack de la pestaña Pokédex.
export type RootStackParamList = {
  Pokedex: undefined;
  Detalle: { id: string; entry: DexEntry };
};

// Stack de la pestaña Equipo.
export type TeamStackParamList = {
  Team: undefined; // lista de equipos guardados
  TeamEdit: { teamId: string };
  TeamPicker: { teamId: string };
  TeamMemberEdit: { teamId: string; memberId: string };
};

// Stack de la pestaña Competitivo.
export type CompetitiveStackParamList = {
  Meta: undefined;
  CompetitiveDetail: { name: string; format: string };
  TeraTypes: undefined;
  Items: undefined;
  Gmax: undefined;
  SpeedTiers: undefined;
  DamageCalc: undefined;
};
