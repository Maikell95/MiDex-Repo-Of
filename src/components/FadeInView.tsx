import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

// Envuelve contenido que aparece (p. ej. al expandir un acordeón) con un fundido
// suave + ligero desplazamiento vertical, en vez de un pop brusco.
export default function FadeInView({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [a]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: a,
          transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
