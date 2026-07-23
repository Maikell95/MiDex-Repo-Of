import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import PokeballIcon from './PokeballIcon';

// Fondo estándar de las pantallas: degradado oscuro sutil + una gran Poké Ball tenue
// en la esquina, para dar identidad sin restar legibilidad.
export default function ScreenBackground({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={['#1a1e2b', colors.bg]} style={styles.fill}>
      <View pointerEvents="none" style={styles.watermarkTop}>
        <PokeballIcon size={300} color={colors.text} opacity={0.04} />
      </View>
      <View pointerEvents="none" style={styles.watermarkBottom}>
        <PokeballIcon size={260} color={colors.text} opacity={0.04} />
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  watermarkTop: { position: 'absolute', top: -60, right: -70 },
  watermarkBottom: { position: 'absolute', bottom: -60, left: -70 },
});
