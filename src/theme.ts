// Paleta de la app y colores por tipo de Pokémon / tier competitivo.

export const colors = {
  bg: '#0f1117',
  card: '#1a1d27',
  cardAlt: '#232735',
  text: '#f2f4f8',
  textDim: '#9aa3b2',
  border: '#2b2f3d',
  accent: '#ef5350',
};

// Color por tipo (esquema clásico Pokémon)
export const typeColors: Record<string, string> = {
  normal: '#9099a1',
  fire: '#ff9d55',
  water: '#4d90d5',
  electric: '#f4d23c',
  grass: '#63bc5a',
  ice: '#73cec0',
  fighting: '#ce4069',
  poison: '#ab6ac8',
  ground: '#d97746',
  flying: '#8fa8dd',
  psychic: '#fa7179',
  bug: '#90c12c',
  rock: '#c7b78b',
  ghost: '#5269ac',
  dragon: '#0b6dc3',
  dark: '#5a5366',
  steel: '#5a8ea1',
  fairy: '#ec8fe6',
};

export function typeColor(type: string): string {
  return typeColors[type.toLowerCase()] ?? colors.textDim;
}

// Color por tier competitivo (Smogon)
const tierColors: Record<string, string> = {
  AG: '#7b1fa2',
  Uber: '#8e24aa',
  OU: '#e53935',
  UUBL: '#f4511e',
  UU: '#fb8c00',
  RUBL: '#fdb022',
  RU: '#fdd835',
  NUBL: '#c0ca33',
  NU: '#7cb342',
  PUBL: '#43a047',
  PU: '#26a69a',
  ZUBL: '#00acc1',
  ZU: '#039be5',
  LC: '#5e35b1',
  NFE: '#546e7a',
  Illegal: '#455a64',
};

export function tierColor(tier?: string): string {
  if (!tier) return colors.textDim;
  return tierColors[tier] ?? colors.textDim;
}

// Nombre completo del stat para la UI
export const statLabels: Record<string, string> = {
  hp: 'PS',
  atk: 'Ataque',
  def: 'Defensa',
  spa: 'At. Esp.',
  spd: 'Def. Esp.',
  spe: 'Velocidad',
};

// Color de la barra de stat según su valor
export function statColor(value: number): string {
  if (value >= 130) return '#00c853';
  if (value >= 100) return '#64dd17';
  if (value >= 80) return '#aeea00';
  if (value >= 60) return '#ffd600';
  if (value >= 40) return '#ff9100';
  return '#ff5252';
}
