import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, typeColor } from '../theme';
import { TYPE_ICON } from '../typeIcons';

// Posiciones dispersas que cubren toda la pantalla (fondo fijo tras el scroll).
const SPOTS: Array<{ top: string; left: string; size: number; rot: string }> = [
  { top: '1%', left: '6%', size: 46, rot: '-18deg' },
  { top: '4%', left: '62%', size: 64, rot: '12deg' },
  { top: '12%', left: '30%', size: 38, rot: '-8deg' },
  { top: '16%', left: '82%', size: 50, rot: '20deg' },
  { top: '24%', left: '-2%', size: 58, rot: '10deg' },
  { top: '30%', left: '46%', size: 40, rot: '-14deg' },
  { top: '34%', left: '74%', size: 44, rot: '6deg' },
  { top: '42%', left: '14%', size: 52, rot: '16deg' },
  { top: '48%', left: '58%', size: 36, rot: '-10deg' },
  { top: '54%', left: '86%', size: 48, rot: '-20deg' },
  { top: '60%', left: '4%', size: 42, rot: '8deg' },
  { top: '66%', left: '40%', size: 60, rot: '-6deg' },
  { top: '72%', left: '70%', size: 38, rot: '14deg' },
  { top: '80%', left: '20%', size: 46, rot: '-16deg' },
  { top: '86%', left: '54%', size: 50, rot: '10deg' },
  { top: '90%', left: '84%', size: 40, rot: '-12deg' },
  { top: '94%', left: '8%', size: 54, rot: '18deg' },
];

// Fondo con los iconos del/los tipo(s) del Pokémon esparcidos por toda la pantalla.
export default function TypeScatterBackground({
  types,
  children,
}: {
  types: string[];
  children: React.ReactNode;
}) {
  const list = types.length ? types : ['normal'];
  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {SPOTS.map((s, i) => {
          const t = list[i % list.length].toLowerCase();
          const def = TYPE_ICON[t] ?? { lib: 'ion', name: 'ellipse' };
          const iconStyle = [
            styles.icon,
            { top: s.top as any, left: s.left as any, transform: [{ rotate: s.rot }] },
          ];
          const color = typeColor(t);
          return def.lib === 'fa5' ? (
            <FontAwesome5 key={i} name={def.name as any} size={s.size} color={color} style={iconStyle} />
          ) : (
            <Ionicons key={i} name={def.name as any} size={s.size} color={color} style={iconStyle} />
          );
        })}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  icon: { position: 'absolute', opacity: 0.2 },
});
