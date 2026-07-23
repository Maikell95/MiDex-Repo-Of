import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { colors } from '../theme';

const SCREEN_H = Dimensions.get('window').height;

// Props que el consumidor debe pasar a su lista scrollable interior para habilitar el
// "deslizar hacia abajo desde el top para cerrar".
export interface SheetScrollProps {
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
}

// Hoja inferior reutilizable: se ajusta a su contenido (hasta un máximo), sin fondo
// oscuro (se ve la pantalla de detrás). Se cierra tocando fuera, deslizando el asa, o
// deslizando hacia abajo cuando la lista interior está en su tope superior.
export default function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode | ((scroll: SheetScrollProps) => React.ReactNode);
}) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const atTop = useRef(true);
  // Mantenemos montada la hoja mientras dura la animación de salida. El desmontaje se
  // dispara con un timeout garantizado (NO con el callback de la animación, que dentro
  // de un Modal a veces no llega y dejaría el backdrop bloqueando toda la pantalla).
  const [render, setRender] = useState(visible);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (visible) {
      setRender(true);
      atTop.current = true;
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 3 }).start();
    } else {
      Animated.timing(translateY, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }).start();
      timer.current = setTimeout(() => setRender(false), 230);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible, translateY]);

  const onMove = (dy: number) => translateY.setValue(dy > 0 ? dy : dy / 6); // resistencia al subir
  const onRelease = (dy: number, vy: number) => {
    if (dy > 90 || vy > 0.8) onClose(); // el efecto de arriba anima la salida al cambiar `visible`
    else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  };

  // Arrastre desde el asa (siempre activo).
  const handlePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 2,
      onPanResponderMove: (_, g) => onMove(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => onRelease(g.dy, g.vy),
    }),
  ).current;

  // Arrastre desde el contenido: solo roba el gesto a la lista si está en el tope y se baja.
  const listPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => atTop.current && g.dy > 10 && g.dy > Math.abs(g.dx),
      onPanResponderMove: (_, g) => onMove(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => onRelease(g.dy, g.vy),
    }),
  ).current;

  const scroll: SheetScrollProps = {
    onScroll: (e) => {
      atTop.current = e.nativeEvent.contentOffset.y <= 0;
    },
    scrollEventThrottle: 16,
  };

  return (
    <Modal visible={render} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.bg} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} {...listPan.panHandlers}>
          <View style={styles.handleZone} {...handlePan.panHandlers}>
            <View style={styles.handle} />
          </View>
          {typeof children === 'function' ? children(scroll) : children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '85%',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  handleZone: { alignItems: 'center', paddingVertical: 14 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.textDim },
});
