import type { DexEntry, StatKey } from './types';

// URL del artwork oficial (repo público de sprites de PokéAPI). Usa `artId` si está
// (megaevoluciones tienen su propio id); si no, el número de Pokédex.
// Con `shiny` devuelve la versión variocolor.
export function artworkUrl(entry: DexEntry, shiny = false): string {
  const id = entry.artId ?? entry.num;
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';
  return shiny ? `${base}/shiny/${id}.png` : `${base}/${id}.png`;
}

// Sprite pequeño para las tarjetas de la lista.
export function spriteUrl(entry: DexEntry): string {
  const id = entry.artId ?? entry.num;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

// Minisprite oficial tipo "icono de caja" (gen 8). No existe para gen 9 -> usar fallback.
export function iconUrl(num: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${num}.png`;
}

// Lista ordenada de URLs candidatas para el sprite. Si una falla (404) se prueba la
// siguiente; termina en el artwork oficial, que existe prácticamente para todo Pokémon
// (incluidas megas de Z-A y formas). Así ninguno queda sin minisprite.
export function spriteCandidates(entry: DexEntry, boxIcon = false): string[] {
  const repo = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  const front = (n: number) => `${repo}/${n}.png`;
  const art = (n: number) => `${repo}/other/official-artwork/${n}.png`;
  const icon = (n: number) => `${repo}/versions/generation-viii/icons/${n}.png`;

  const id = entry.artId ?? entry.num;
  const isForm = entry.artId != null && entry.artId !== entry.num;

  const out: string[] = [];
  if (boxIcon && !isForm) out.push(icon(entry.num)); // icono de caja para especies base
  out.push(front(id), art(id)); // sprite frontal y artwork por id (forma o base)
  if (id !== entry.num) out.push(front(entry.num), art(entry.num)); // último recurso: base
  return out;
}

// #001, #025, #150...
export function dexNumber(num: number): string {
  return `#${String(num).padStart(3, '0')}`;
}

export const STAT_ORDER: StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

export function statTotal(entry: DexEntry): number {
  return STAT_ORDER.reduce((sum, k) => sum + entry.baseStats[k], 0);
}

// Lista de habilidades (normal, oculta) a partir del objeto abilities.
export function abilityList(entry: DexEntry): Array<{ name: string; hidden: boolean }> {
  const out: Array<{ name: string; hidden: boolean }> = [];
  for (const [slot, name] of Object.entries(entry.abilities)) {
    if (name) out.push({ name, hidden: slot === 'H' });
  }
  return out;
}

// Convierte un nombre de habilidad/movimiento a su id de Showdown (minúsculas, sin símbolos).
export function toId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Entidades HTML frecuentes en los textos de Smogon.
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#039;': "'",
  '&apos;': "'", '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
};

// Limpia el texto de análisis de Smogon: quita etiquetas HTML, decodifica entidades
// (incluidas las numéricas &#123;) y normaliza los espacios.
export function stripHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (e) => HTML_ENTITIES[e.toLowerCase()] ?? e)
    .replace(/\s+/g, ' ')
    .trim();
}
