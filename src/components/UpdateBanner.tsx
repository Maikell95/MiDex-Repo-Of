import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkForUpdate, downloadAndInstall, type UpdateInfo } from '../api/update';
import { colors } from '../theme';

// Banner que aparece automáticamente cuando hay una versión más nueva en GitHub.
// Descarga el APK e inicia el instalador de Android al pulsar "Actualizar".
export default function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [progress, setProgress] = useState<number | null>(null); // null = sin descargar

  useEffect(() => {
    checkForUpdate().then(setInfo).catch(() => {});
  }, []);

  if (!info || dismissed) return null;

  const downloading = progress !== null;

  const onUpdate = async () => {
    if (downloading) return;
    setProgress(0);
    try {
      await downloadAndInstall(info.url, setProgress);
      // Al abrir el instalador dejamos el banner; el usuario vuelve tras instalar.
      setProgress(null);
    } catch (e) {
      setProgress(null);
      Alert.alert('No se pudo actualizar', 'Revisa tu conexión e inténtalo de nuevo.');
    }
  };

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 70 }]} pointerEvents="box-none">
      <View style={styles.card}>
        <Ionicons name="rocket" size={22} color={colors.accent} />
        <View style={styles.body}>
          <Text style={styles.title}>Nueva versión {info.version}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {downloading ? `Descargando… ${Math.round((progress ?? 0) * 100)}%` : 'Toca para actualizar'}
          </Text>
          {downloading ? (
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round((progress ?? 0) * 100)}%` }]} />
            </View>
          ) : null}
        </View>
        {downloading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <Pressable style={styles.btn} onPress={onUpdate}>
              <Text style={styles.btnTxt}>Actualizar</Text>
            </Pressable>
            <Pressable hitSlop={10} onPress={() => setDismissed(true)}>
              <Ionicons name="close" size={20} color={colors.textDim} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, alignItems: 'stretch' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: 12,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  body: { flex: 1 },
  title: { color: colors.text, fontSize: 14, fontWeight: '900' },
  sub: { color: colors.textDim, fontSize: 12, marginTop: 1 },
  track: { height: 5, borderRadius: 3, backgroundColor: colors.cardAlt, marginTop: 6, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  btn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
