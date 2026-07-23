// Icono representativo de cada tipo (Ionicons por defecto; FontAwesome5 para los más temáticos).
export type TypeIconDef = { lib: 'ion' | 'fa5'; name: string };

export const TYPE_ICON: Record<string, TypeIconDef> = {
  normal: { lib: 'ion', name: 'ellipse' },
  fire: { lib: 'ion', name: 'flame' },
  water: { lib: 'ion', name: 'water' },
  electric: { lib: 'ion', name: 'flash' },
  grass: { lib: 'ion', name: 'leaf' },
  ice: { lib: 'ion', name: 'snow' },
  fighting: { lib: 'ion', name: 'barbell' },
  poison: { lib: 'ion', name: 'flask' },
  ground: { lib: 'fa5', name: 'mountain' },
  flying: { lib: 'fa5', name: 'dove' },
  psychic: { lib: 'ion', name: 'eye' },
  bug: { lib: 'ion', name: 'bug' },
  rock: { lib: 'fa5', name: 'gem' },
  ghost: { lib: 'ion', name: 'skull' },
  dragon: { lib: 'fa5', name: 'dragon' },
  dark: { lib: 'ion', name: 'moon' },
  steel: { lib: 'ion', name: 'cog' },
  fairy: { lib: 'ion', name: 'sparkles' },
};
