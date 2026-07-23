// Traducción automática EN->ES para el texto competitivo de Smogon (solo existe en inglés).
// Usa el endpoint gratuito de Google (sin clave). Cachea en memoria y, si falla,
// devuelve el texto original en inglés para no romper la UI.

const cache = new Map<string, string>();
const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

// Divide texto largo en trozos por debajo del límite práctico de la URL.
function chunk(text: string, max = 1800): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > max) {
    // Cortar en el último punto/espacio antes del límite.
    let cut = rest.lastIndexOf('. ', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max);
    if (cut <= 0) cut = max;
    parts.push(rest.slice(0, cut + 1));
    rest = rest.slice(cut + 1);
  }
  if (rest) parts.push(rest);
  return parts;
}

async function translateChunk(text: string): Promise<string> {
  const url =
    `${ENDPOINT}?client=gtx&sl=en&tl=es&dt=t&q=` + encodeURIComponent(text);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`translate ${res.status}`);
  const data = (await res.json()) as [Array<[string, string]>, ...unknown[]];
  return data[0].map((seg) => seg[0]).join('');
}

// Ajusta la traducción a la terminología oficial de Pokémon en español para que sea
// más clara: HP -> PS, noquear/noqueado -> debilitar/debilitado, y limpia espacios.
function tidy(es: string): string {
  return es
    .replace(/\s{2,}/g, ' ')
    .replace(/\bHP\b/g, 'PS')
    .replace(/noquead([oa]s?)/gi, 'debilitad$1')
    .replace(/noquear/gi, 'debilitar')
    .replace(/noquea/gi, 'debilita')
    .trim();
}

// Traduce un texto EN->ES. Devuelve el original si algo falla.
export async function translateEs(text?: string): Promise<string> {
  if (!text) return '';
  const key = text.trim();
  if (!key) return '';
  const hit = cache.get(key);
  if (hit != null) return hit;

  try {
    const parts = chunk(key);
    const out: string[] = [];
    for (const p of parts) out.push(await translateChunk(p));
    const result = tidy(out.join(''));
    cache.set(key, result);
    return result;
  } catch {
    return text; // fallback: inglés
  }
}
