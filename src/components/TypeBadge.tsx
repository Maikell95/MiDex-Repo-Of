import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typeColor } from '../theme';

const TYPE_ES: Record<string, string> = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico',
  grass: 'Planta', ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno',
  ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
  rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro',
  steel: 'Acero', fairy: 'Hada',
};

// `tera` muestra un rombo dentro del badge (para indicar el teratipo).
export default function TypeBadge({ type, small, tera }: { type: string; small?: boolean; tera?: boolean }) {
  const label = TYPE_ES[type.toLowerCase()] ?? type;
  return (
    <View style={[styles.badge, { backgroundColor: typeColor(type) }, small && styles.small, tera && styles.row]}>
      {tera ? <Ionicons name="diamond" size={small ? 9 : 11} color="#fff" style={styles.diamond} /> : null}
      <Text style={[styles.text, small && styles.textSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    marginTop: 4,
  },
  small: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9, marginRight: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  diamond: { marginRight: 3 },
  text: { color: '#fff', fontWeight: '700', fontSize: 12 },
  textSmall: { fontSize: 10 },
});
