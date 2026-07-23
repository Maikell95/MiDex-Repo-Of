import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, typeColor } from '../theme';
import { TYPE_ICON } from '../typeIcons';

// Botón circular con el icono del tipo. Al estar activo muestra un aro circular.
export default function TypeCircle({
  type,
  active,
  onPress,
  size = 44,
}: {
  type: string;
  active?: boolean;
  onPress?: () => void;
  size?: number;
}) {
  const def = TYPE_ICON[type.toLowerCase()] ?? { lib: 'ion', name: 'ellipse' };
  const iconSize = size * 0.5;
  const circle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: typeColor(type),
  };
  return (
    <Pressable onPress={onPress} style={active ? styles.ringWrap : undefined}>
      <View style={[styles.circle, circle]}>
        {def.lib === 'fa5' ? (
          <FontAwesome5 name={def.name as never} size={iconSize} color="#fff" />
        ) : (
          <Ionicons name={def.name as never} size={iconSize} color="#fff" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  // Aro circular alrededor del botón cuando está seleccionado.
  ringWrap: {
    borderRadius: 100,
    borderWidth: 3,
    borderColor: colors.text,
    padding: 2,
  },
});
