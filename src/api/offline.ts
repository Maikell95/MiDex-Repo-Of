import * as FileSystem from 'expo-file-system/legacy';

// Estrategia offline para datos no-competitivos:
//  1) Se devuelve al instante la caché en disco (si existe) o el JSON EMPAQUETADO.
//  2) Si hay internet y la caché es vieja (o no existe), se refresca en segundo plano.
// Así funciona sin conexión y se mantiene al día solo.

const DIR = FileSystem.documentDirectory + 'pkdxdata/';
const TTL_MS = 24 * 60 * 60 * 1000; // refresca como mucho una vez al día

const refreshing = new Set<string>();

async function ensureDir() {
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  } catch {
    /* ignora */
  }
}

function backgroundRefresh<T>(path: string, fetchFresh: () => Promise<T>, staleOrMissing: boolean) {
  if (!staleOrMissing || refreshing.has(path)) return;
  refreshing.add(path);
  fetchFresh()
    .then(async (data) => {
      await ensureDir();
      await FileSystem.writeAsStringAsync(path, JSON.stringify(data));
    })
    .catch(() => {
      /* sin conexión o error: seguimos con lo que había */
    })
    .finally(() => refreshing.delete(path));
}

// Devuelve los datos (caché o empaquetados) y dispara un refresco en segundo plano.
export async function offlineJson<T>(
  key: string,
  bundled: () => T,
  fetchFresh: () => Promise<T>,
): Promise<T> {
  const path = `${DIR}${key}.json`;
  let cached: T | null = null;
  let stale = true;

  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      cached = JSON.parse(await FileSystem.readAsStringAsync(path)) as T;
      const age = Date.now() - (info.modificationTime ? info.modificationTime * 1000 : 0);
      stale = age > TTL_MS;
    }
  } catch {
    cached = null;
  }

  backgroundRefresh(path, fetchFresh, stale || cached === null);
  return cached ?? bundled();
}

// Igual que offlineJson pero SIN datos empaquetados (para lo competitivo, que se descarga):
//  - Si hay caché en disco → se devuelve al instante y, si es de hace >24 h, se refresca
//    en segundo plano (así se mantiene al día a diario y funciona sin conexión).
//  - Si no hay caché → se descarga ahora (falla si no hay internet), y se guarda.
const memCache: Record<string, Promise<unknown>> = {};
export function cachedJson<T>(key: string, fetchFresh: () => Promise<T>): Promise<T> {
  if (key in memCache) return memCache[key] as Promise<T>;
  const safe = key.replace(/[^a-z0-9]+/gi, '_');
  const path = `${DIR}comp_${safe}.json`;

  const p = (async () => {
    let cached: T | null = null;
    let stale = true;
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        cached = JSON.parse(await FileSystem.readAsStringAsync(path)) as T;
        const age = Date.now() - (info.modificationTime ? info.modificationTime * 1000 : 0);
        stale = age > TTL_MS;
      }
    } catch {
      cached = null;
    }

    if (cached !== null) {
      backgroundRefresh(path, fetchFresh, stale); // refresco diario en segundo plano
      return cached;
    }

    // Primera vez (o caché ilegible): hay que descargarlo ahora.
    const fresh = await fetchFresh();
    await ensureDir();
    try {
      await FileSystem.writeAsStringAsync(path, JSON.stringify(fresh));
    } catch {
      /* si no se puede guardar, seguimos igualmente */
    }
    return fresh;
  })();

  memCache[key] = p;
  p.catch(() => delete memCache[key]); // si falla (sin caché + sin internet), permitir reintento
  return p as Promise<T>;
}
