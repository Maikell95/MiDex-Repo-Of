import type { DexEntry } from './types';

// Nombres en español de los objetos de evolución.
const ITEM_ES: Record<string, string> = {
  'Auspicious Armor': 'Armadura Auspiciosa',
  'Chipped Pot': 'Tetera Rajada',
  'Cracked Pot': 'Tetera Agrietada',
  'Dawn Stone': 'Piedra Alba',
  'Deep Sea Scale': 'Escama Marina',
  'Deep Sea Tooth': 'Diente Marino',
  'Dragon Scale': 'Escama Dragón',
  'Dubious Disc': 'Disco Extraño',
  'Dusk Stone': 'Piedra Noche',
  Electirizer: 'Electrizador',
  'Fire Stone': 'Piedra Fuego',
  'Galarica Cuff': 'Brazal Galanuez',
  'Galarica Wreath': 'Corona Galanuez',
  'Ice Stone': 'Piedra Hielo',
  "King's Rock": 'Roca del Rey',
  'Leaf Stone': 'Piedra Hoja',
  Magmarizer: 'Magmatizador',
  'Malicious Armor': 'Armadura Ignominiosa',
  'Masterpiece Teacup': 'Taza Maestra',
  'Metal Alloy': 'Metal Aleado',
  'Metal Coat': 'Revestimiento Metálico',
  'Moon Stone': 'Piedra Lunar',
  'Oval Stone': 'Piedra Oval',
  'Prism Scale': 'Escama Bella',
  Protector: 'Protector',
  'Razor Claw': 'Garra Afilada',
  'Razor Fang': 'Colmillo Agudo',
  'Reaper Cloth': 'Tela Terrible',
  Sachet: 'Bolsa Aromática',
  'Shiny Stone': 'Piedra Día',
  'Sun Stone': 'Piedra Solar',
  'Sweet Apple': 'Manzana Dulce',
  'Syrupy Apple': 'Manzana Melosa',
  'Tart Apple': 'Manzana Ácida',
  'Thunder Stone': 'Piedra Trueno',
  'Unremarkable Teacup': 'Taza Mediocre',
  'Up-Grade': 'Mejora',
  'Water Stone': 'Piedra Agua',
  'Whipped Dream': 'Nata Montada',
};

// Nombres en español de los movimientos usados como condición de evolución.
const MOVE_ES: Record<string, string> = {
  'Ancient Power': 'Poder Pasado',
  'Double Hit': 'Doble Golpe',
  'Dragon Cheer': 'Ánimo Dragón',
  'Dragon Pulse': 'Pulso Dragón',
  'Hyper Drill': 'Hiperbarrena',
  Mimic: 'Mimético',
  'Play Rough': 'Carantoña',
  Rollout: 'Desenrollar',
  Stomp: 'Pisotón',
  Taunt: 'Mofa',
  'Twin Beam': 'Doble Rayo',
};

// Condiciones especiales de evolución en español.
const COND_ES: Record<string, string> = {
  'Black Augurite': 'con Mineral Negro',
  'Defeat 3 Bisharp leading Pawniard and level-up':
    'derrota a 3 Bisharp que lideren Pawniard y sube de nivel',
  'Defeat the Rapid Strike Tower': 'supera la Torre Estilo Fluido',
  'Defeat the Single Strike Tower': 'supera la Torre Estilo Firme',
  'Have 49+ HP lost and walk under stone sculpture in Dusty Bowl':
    'con 49+ PS perdidos, pasa bajo la escultura de piedra en la Cuenca Polvo',
  'Land 3 critical hits in 1 battle': 'asesta 3 golpes críticos en un combate',
  'Level up with 999 Coins in the bag': 'sube de nivel con 999 monedas en la bolsa',
  "Peat Block when there's a full moon": 'con Bloque de Turba en luna llena',
  'Receive 294+ recoil without fainting': 'recibe 294+ de daño de retroceso sin debilitarte',
  'Use Agile style Psyshield Bash 20 times': 'usa Escudo Psíquico en estilo ágil 20 veces',
  'Use Rage Fist 20 times and level-up': 'usa Puño Furia 20 veces y sube de nivel',
  'Use Strong style Barb Barrage 20 times': 'usa Bombardeo en estilo fuerte 20 veces',
  "Walk 1000 steps in Let's Go": "camina 1000 pasos en Let's Go",
  "walk 1000 steps in Let's Go": "camina 1000 pasos en Let's Go",
  'at night': 'de noche',
  'during rain': 'con lluvia',
  'during the day': 'de día',
  'from a special Rockruff during the evening': 'desde un Rockruff especial al anochecer',
  'near a special magnetic field': 'cerca de un campo magnético especial',
  'spin while holding a Sweet': 'gira sosteniendo un Dulce',
  'with a Dark-type in the party': 'con un Pokémon de tipo Siniestro en el equipo',
  'with a Fairy-type move and two levels of Affection':
    'conociendo un movimiento de tipo Hada y con 2 de cariño',
  'with a Karrablast': 'intercambiando por un Karrablast',
  'with a Remoraid in party': 'con un Remoraid en el equipo',
  'with a Shelmet': 'intercambiando por un Shelmet',
  'with an Atk stat < its Def stat': 'con Ataque menor que Defensa',
  'with an Atk stat > its Def stat': 'con Ataque mayor que Defensa',
  'with an Atk stat equal to its Def stat': 'con Ataque igual a Defensa',
  'with the console turned upside-down': 'con la consola boca abajo',
};

const item = (name?: string) => (name ? ITEM_ES[name] ?? name : '');
const move = (name?: string) => (name ? MOVE_ES[name] ?? name : '');
const cond = (c?: string) => (c ? COND_ES[c] ?? c : '');

function withCond(base: string, c?: string): string {
  const t = cond(c);
  return t ? `${base} (${t})` : base;
}

// Describe en español cómo evoluciona una etapa a partir de su prevo.
// Devuelve '' si el Pokémon no tiene evolución previa (es la base de la línea).
export function describeEvolution(e: DexEntry): string {
  if (!e.prevo) return '';
  switch (e.evoType) {
    case 'trade':
      return withCond(e.evoItem ? `Intercambio con ${item(e.evoItem)}` : 'Intercambio', e.evoCondition);
    case 'useItem':
      return withCond(`Usar ${item(e.evoItem)}`, e.evoCondition);
    case 'levelFriendship':
      return withCond('Amistad alta', e.evoCondition);
    case 'levelHold':
      return withCond(`Sube de nivel con ${item(e.evoItem)}`, e.evoCondition);
    case 'levelMove':
      return withCond(`Sube de nivel sabiendo ${move(e.evoMove)}`, e.evoCondition);
    case 'levelExtra':
    case 'other': {
      const c = cond(e.evoCondition);
      return c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Método especial';
    }
    default:
      if (e.evoLevel) return withCond(`Nivel ${e.evoLevel}`, e.evoCondition);
      return e.evoCondition ? cond(e.evoCondition) : 'Sube de nivel';
  }
}
