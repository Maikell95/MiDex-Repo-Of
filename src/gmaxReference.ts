// Contenido de referencia de Dinamax/Gigantamax (mecánica estática y conocida).

export const GMAX_INTRO =
  'La Dinamax agranda al Pokémon durante 3 turnos y aumenta mucho sus PS (hasta el doble). ' +
  'Sus ataques se convierten en Movimientos Max según su tipo, y los de estado pasan a ser ' +
  'Barrera Max (protege ese turno). Cada Movimiento Max añade un efecto extra (clima, campo o ' +
  'cambios de estadísticas). Algunos Pokémon concretos pueden Gigantamaximizarse: adoptan una ' +
  'forma especial y su Movimiento Max de cierto tipo se convierte en un movimiento G-Max ' +
  'exclusivo, con un efecto más potente.';

// Cómo se calcula la potencia del Movimiento Max a partir de la potencia base del ataque.
export const POWER_INTRO =
  'La potencia del Movimiento Max depende de la potencia del ataque base (no de la del Max). ' +
  'Los ataques de tipo Lucha y Veneno usan una tabla reducida:';
export const POWER_ROWS: Array<{ base: string; normal: string; fightpoison: string }> = [
  { base: '≤ 40', normal: '90', fightpoison: '70' },
  { base: '45–50', normal: '100', fightpoison: '75' },
  { base: '55–60', normal: '110', fightpoison: '80' },
  { base: '65–100', normal: '120', fightpoison: '90' },
  { base: '105–140', normal: '130', fightpoison: '95' },
  { base: '≥ 150', normal: '140', fightpoison: '100' },
];

// Descripciones claras (en español) de cada movimiento G-Max exclusivo, por nombre.
export const GMAX_DESC: Record<string, string> = {
  'G-Max Vine Lash': 'Inflige daño (1/6 de los PS máx.) al final de cada turno a los rivales que no sean de tipo Planta, durante 4 turnos.',
  'G-Max Wildfire': 'Inflige daño cada turno a los rivales que no sean de tipo Fuego, durante 4 turnos.',
  'G-Max Cannonade': 'Inflige daño cada turno a los rivales que no sean de tipo Agua, durante 4 turnos.',
  'G-Max Volcalith': 'Inflige daño cada turno a los rivales que no sean de tipo Roca, durante 4 turnos.',
  'G-Max Befuddle': 'Deja a los rivales dormidos, envenenados o paralizados (efecto al azar).',
  'G-Max Centiferno': 'Atrapa a los rivales en llamas 4-5 turnos: reciben daño y no pueden huir ni cambiar.',
  'G-Max Sandblast': 'Atrapa a los rivales en arena 4-5 turnos: reciben daño y no pueden huir ni cambiar.',
  'G-Max Fireball': 'Potencia fija de 160 e ignora la habilidad del rival.',
  'G-Max Drum Solo': 'Potencia fija de 160 e ignora la habilidad del rival.',
  'G-Max Hydrosnipe': 'Potencia fija de 160 e ignora la habilidad del rival.',
  'G-Max Steelsurge': 'Coloca una trampa de acero: daña a los rivales que entren al combate (según su debilidad al Acero).',
  'G-Max Wind Rage': 'Elimina campos, pantallas (Reflejo/Pantalla Luz) y trampas del lado rival.',
  'G-Max Stonesurge': 'Coloca Trampa Rocas: daña a los rivales que entren al combate.',
  'G-Max Depletion': 'Reduce en 2 los PP del último movimiento usado por los rivales.',
  'G-Max Cuddle': 'Enamora a los rivales (pueden quedar inmovilizados).',
  'G-Max Tartness': 'Baja la evasión de los rivales (-1).',
  'G-Max Malodor': 'Envenena a los rivales.',
  'G-Max Terror': 'Impide huir o cambiar a los rivales (los atrapa).',
  'G-Max Snooze': '50% de provocar bostezo al objetivo: se dormirá al final del turno siguiente.',
  'G-Max Smite': 'Confunde a los rivales.',
  'G-Max Foam Burst': 'Baja mucho la Velocidad de los rivales (-2).',
  'G-Max Resonance': 'Crea Velo Aurora en tu lado: reduce el daño físico y especial durante 5 turnos.',
  'G-Max Chi Strike': 'Sube la probabilidad de golpe crítico de tu equipo.',
  'G-Max Meltdown': 'Causa tormento a los rivales: no pueden repetir el mismo movimiento dos veces seguidas.',
  'G-Max Gold Rush': 'Confunde a los rivales (y en el juego reparte dinero).',
  'G-Max Gravitas': 'Activa Gravedad 5 turnos: sube la precisión y los movimientos de tipo Volador/levitación quedan anulados.',
  'G-Max Volt Crash': 'Paraliza a los rivales.',
  'G-Max Replenish': '50% de restaurar las bayas que haya consumido tu equipo.',
  'G-Max Stun Shock': 'Envenena o paraliza a los rivales (efecto al azar).',
  'G-Max One Blow': 'Atraviesa la Barrera Max: daña al rival aunque se proteja con un Movimiento Max.',
  'G-Max Rapid Flow': 'Atraviesa la Barrera Max: daña al rival aunque se proteja con un Movimiento Max.',
  'G-Max Finale': 'Cura 1/6 de los PS máximos de tu equipo.',
  'G-Max Sweetness': 'Cura los problemas de estado de tu equipo.',
};

// Movimiento Max por tipo (nombre oficial en inglés + efecto en español).
export interface MaxMoveRef {
  type: string;
  name: string;
  effect: string;
}
export const MAX_MOVES: MaxMoveRef[] = [
  { type: 'normal', name: 'Max Strike', effect: 'Baja la Velocidad de los rivales.' },
  { type: 'fire', name: 'Max Flare', effect: 'Activa el sol.' },
  { type: 'water', name: 'Max Geyser', effect: 'Activa la lluvia.' },
  { type: 'electric', name: 'Max Lightning', effect: 'Crea un campo eléctrico.' },
  { type: 'grass', name: 'Max Overgrowth', effect: 'Crea un campo de hierba.' },
  { type: 'ice', name: 'Max Hailstorm', effect: 'Activa el granizo.' },
  { type: 'fighting', name: 'Max Knuckle', effect: 'Sube el Ataque del equipo (+1).' },
  { type: 'poison', name: 'Max Ooze', effect: 'Sube el At. Esp. del equipo (+1).' },
  { type: 'ground', name: 'Max Quake', effect: 'Sube la Def. Esp. del equipo (+1).' },
  { type: 'flying', name: 'Max Airstream', effect: 'Sube la Velocidad del equipo (+1).' },
  { type: 'psychic', name: 'Max Mindstorm', effect: 'Crea un campo psíquico.' },
  { type: 'bug', name: 'Max Flutterby', effect: 'Baja el At. Esp. de los rivales.' },
  { type: 'rock', name: 'Max Rockfall', effect: 'Activa la tormenta de arena.' },
  { type: 'ghost', name: 'Max Phantasm', effect: 'Baja la Defensa de los rivales.' },
  { type: 'dragon', name: 'Max Wyrmwind', effect: 'Baja el Ataque de los rivales.' },
  { type: 'dark', name: 'Max Darkness', effect: 'Baja la Def. Esp. de los rivales.' },
  { type: 'steel', name: 'Max Steelspike', effect: 'Sube la Defensa del equipo (+1).' },
  { type: 'fairy', name: 'Max Starfall', effect: 'Crea un campo de niebla.' },
];
