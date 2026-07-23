import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Flecha que rota suavemente al abrir/cerrar (en vez de saltar de ▼ a ▲).
export default function Chevron({ open }: { open: boolean }) {
  const a = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(a, { toValue: open ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [open, a]);

  const rotate = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return <Animated.Text style={[styles.chevron, { transform: [{ rotate }] }]}>▾</Animated.Text>;
}

const styles = StyleSheet.create({
  chevron: { color: colors.textDim, fontSize: 13, marginLeft: 8 },
});
