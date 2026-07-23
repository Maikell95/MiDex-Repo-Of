// Auto-actualización desde GitHub Releases:
//  1) consulta la última release del repo,
//  2) compara su versión (tag) con la instalada,
//  3) si es más nueva, permite descargar el APK e iniciar el instalador de Android.
//
// Android no permite instalación silenciosa a apps normales: descargamos el APK y
// lanzamos el instalador del sistema (el usuario confirma con un toque).

import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

const REPO = 'Maikell95/MiDex-Repo-Of';

export interface UpdateInfo {
  version: string; // p.ej. "1.2.0"
  url: string; // enlace de descarga del .apk
  notes: string; // notas de la release
}

const parseVer = (v: string): number[] => v.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);

// ¿remote > local?
function isNewer(remote: string, local: string): boolean {
  const r = parseVer(remote);
  const l = parseVer(local);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const a = r[i] ?? 0;
    const b = l[i] ?? 0;
    if (a !== b) return a > b;
  }
  return false;
}

// Devuelve la info de actualización si hay una versión más nueva publicada; si no, null.
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const rel = await res.json();
    const tag: string = rel?.tag_name ?? '';
    const apk = (rel?.assets ?? []).find((a: { name?: string }) => a.name?.toLowerCase().endsWith('.apk'));
    if (!tag || !apk?.browser_download_url) return null;

    const current = Application.nativeApplicationVersion ?? '0.0.0';
    if (!isNewer(tag, current)) return null;

    return { version: tag.replace(/^v/i, ''), url: apk.browser_download_url, notes: rel?.body ?? '' };
  } catch {
    return null; // sin conexión o error: no molestamos
  }
}

// Descarga el APK (con progreso 0..1) y abre el instalador de Android.
export async function downloadAndInstall(url: string, onProgress?: (p: number) => void): Promise<void> {
  const dest = `${FileSystem.cacheDirectory}midex-update.apk`;
  try {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  } catch {
    /* no existía */
  }

  const dl = FileSystem.createDownloadResumable(url, dest, {}, (p) => {
    if (p.totalBytesExpectedToWrite > 0) onProgress?.(p.totalBytesWritten / p.totalBytesExpectedToWrite);
  });
  const result = await dl.downloadAsync();
  if (!result?.uri) throw new Error('No se pudo descargar la actualización.');

  // content:// URI (vía FileProvider de Expo) que el instalador puede leer.
  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  });
}
