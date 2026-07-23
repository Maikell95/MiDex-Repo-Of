// Perfil de cada tipo (type chart canónico Gen 6+, generado desde PokéAPI) + un resumen
// competitivo del uso como teratipo. Datos estáticos y fiables (el type chart no cambia).

export interface TeraProfile {
  se: string[]; // supereficaz contra (como atacante)
  weak: string[]; // débil a (como defensor)
  res: string[]; // resiste (como defensor)
  immTo: string[]; // inmune a (como defensor)
  note: string; // resumen competitivo del teratipo
}

export const TERA_INTRO =
  'La Teracristalización cambia el tipo del Pokémon a su teratipo: potencia el STAB de ese tipo ' +
  '(x2 si coincide con uno original) y sustituye sus debilidades y resistencias por las del nuevo tipo. ' +
  'Se usa tanto ofensiva (más daño y cobertura) como defensivamente (quitar debilidades clave).';

export const TERA_ORDER = [
  'fairy', 'steel', 'water', 'fire', 'flying', 'ground', 'fighting', 'ghost', 'dark',
  'dragon', 'grass', 'electric', 'ice', 'poison', 'psychic', 'rock', 'bug', 'normal',
];

export const TERA: Record<string, TeraProfile> = {
  normal: { se: [], weak: ['fighting'], res: [], immTo: ['ghost'], note: 'Poco común. Aporta inmunidad a Fantasma, pero ofensivamente es flojo.' },
  fighting: { se: ['normal', 'rock', 'steel', 'ice', 'dark'], weak: ['flying', 'psychic', 'fairy'], res: ['rock', 'bug', 'dark'], immTo: [], note: 'Ofensivo fuerte: STAB de Lucha con gran cobertura contra Normal, Acero y Siniestro.' },
  flying: { se: ['fighting', 'bug', 'grass'], weak: ['rock', 'electric', 'ice'], res: ['fighting', 'bug', 'grass'], immTo: ['ground'], note: 'Defensivo popular: gana inmunidad a Tierra y resistencias útiles.' },
  poison: { se: ['grass', 'fairy'], weak: ['ground', 'psychic'], res: ['fighting', 'poison', 'bug', 'grass', 'fairy'], immTo: [], note: 'Defensivo: resiste Hada, Lucha y Planta; bueno contra equipos con Hadas.' },
  ground: { se: ['poison', 'rock', 'steel', 'fire', 'electric'], weak: ['water', 'grass', 'ice'], res: ['poison', 'rock'], immTo: ['electric'], note: 'Ofensivo con inmunidad a Eléctrico; gran cobertura contra Acero y Fuego.' },
  rock: { se: ['flying', 'bug', 'fire', 'ice'], weak: ['fighting', 'ground', 'steel', 'water', 'grass'], res: ['normal', 'flying', 'poison', 'fire'], immTo: [], note: 'De nicho. Mejora el STAB de Roca, pero tiene muchas debilidades defensivas.' },
  bug: { se: ['grass', 'psychic', 'dark'], weak: ['flying', 'rock', 'fire'], res: ['fighting', 'ground', 'grass'], immTo: [], note: 'Situacional; se usa poco como teratipo ofensivo.' },
  ghost: { se: ['ghost', 'psychic'], weak: ['ghost', 'dark'], res: ['poison', 'bug'], immTo: ['normal', 'fighting'], note: 'Inmunidad a Normal y Lucha; útil para bloquear Giro Rápido y esquivar coberturas.' },
  steel: { se: ['rock', 'ice', 'fairy'], weak: ['fighting', 'ground', 'fire'], res: ['normal', 'flying', 'rock', 'bug', 'steel', 'grass', 'psychic', 'ice', 'dragon', 'fairy'], immTo: ['poison'], note: 'Teratipo defensivo tope: 10 resistencias. Ideal para pivotes y set-up.' },
  fire: { se: ['bug', 'steel', 'grass', 'ice'], weak: ['ground', 'rock', 'water'], res: ['bug', 'steel', 'fire', 'grass', 'ice', 'fairy'], immTo: [], note: 'Ofensivo y defensivo: elimina debilidades comunes y da buena cobertura.' },
  water: { se: ['ground', 'rock', 'fire'], weak: ['grass', 'electric'], res: ['steel', 'fire', 'water', 'ice'], immTo: [], note: 'Defensivo sólido: solo dos debilidades y STAB de Agua fiable.' },
  grass: { se: ['ground', 'rock', 'water'], weak: ['flying', 'poison', 'bug', 'fire', 'ice'], res: ['ground', 'water', 'grass', 'electric'], immTo: [], note: 'Inmunidad a polvos y Reguero; resiste Agua, Eléctrico y Tierra.' },
  electric: { se: ['flying', 'water'], weak: ['ground'], res: ['flying', 'steel', 'electric'], immTo: [], note: 'Inmunidad a parálisis y solo débil a Tierra; STAB rápido y ofensivo.' },
  psychic: { se: ['fighting', 'poison'], weak: ['bug', 'ghost', 'dark'], res: ['fighting', 'psychic'], immTo: [], note: 'Situacional; queda expuesto a coberturas comunes (Siniestro, Bicho, Fantasma).' },
  ice: { se: ['flying', 'ground', 'grass', 'dragon'], weak: ['fighting', 'rock', 'steel', 'fire'], res: ['ice'], immTo: [], note: 'Gran cobertura ofensiva (dragones, tierra, volador) pero muy frágil defensivamente.' },
  dragon: { se: ['dragon'], weak: ['ice', 'dragon', 'fairy'], res: ['fire', 'water', 'grass', 'electric'], immTo: [], note: 'STAB muy potente; solo débil a Hada, Hielo y Dragón.' },
  dark: { se: ['ghost', 'psychic'], weak: ['fighting', 'bug', 'fairy'], res: ['ghost', 'dark'], immTo: ['psychic'], note: 'Inmunidad a Psíquico; excelente STAB para barredores de set-up.' },
  fairy: { se: ['fighting', 'dragon', 'dark'], weak: ['poison', 'steel'], res: ['fighting', 'bug', 'dark'], immTo: ['dragon'], note: 'Muy popular: inmunidad a Dragón, buenas resistencias y STAB fuerte.' },
};
