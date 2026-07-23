import React, { useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { colors } from '../theme';
import type { DexEntry } from '../types';
import { artworkUrl } from '../utils';

const SIZE = 220; // mismo tamaño que la imagen original

// Cabecera con artwork de tamaño fijo. Desliza a la izquierda para ver el shiny,
// a la derecha para volver al normal.
//
// Usamos un ScrollView horizontal con paginado en lugar de un PanResponder: el
// ScrollView coordina el gesto a nivel nativo (pide a los contenedores padre —incluido
// el PagerView de las pestañas— que no intercepten el toque), así el deslizamiento
// funciona de forma fiable dentro del dashboard con swipe entre vistas.
export default function ArtworkCarousel({ entry }: { entry: DexEntry }) {
  const [shiny, setShiny] = useState(false);
  const ref = useRef<ScrollView>(null);

  function onEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(e.nativeEvent.contentOffset.x / SIZE);
    setShiny(page === 1);
  }

  return (
    <View style={styles.wrap}>
      {/* Contenedor de tamaño fijo: acota la altura del ScrollView (en Fabric el
          height en el propio ScrollView no siempre se respeta). */}
      <View style={styles.box}>
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onEnd}
          onScrollEndDrag={onEnd}
          // Evita que un padre vertical/pager robe el gesto horizontal.
          directionalLockEnabled
        >
          <Image source={{ uri: artworkUrl(entry, false) }} style={styles.img} resizeMode="contain" />
          <Image source={{ uri: artworkUrl(entry, true) }} style={styles.img} resizeMode="contain" />
        </ScrollView>
      </View>

      <View style={styles.dots}>
        <View style={[styles.dot, !shiny && styles.dotActive]} />
        <View style={[styles.dot, shiny && styles.dotActive]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  box: { width: SIZE, height: SIZE, overflow: 'hidden' },
  img: { width: SIZE, height: SIZE },
  dots: { flexDirection: 'row', marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border, marginHorizontal: 4 },
  dotActive: { backgroundColor: colors.accent, width: 18 },
});
