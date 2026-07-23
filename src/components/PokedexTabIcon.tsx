import React from 'react';
import Svg, { Circle, Rect } from 'react-native-svg';

// Icono de dispositivo "Pokédex" (cuerpo + lente circular + LEDs + pantalla), a medida,
// para la pestaña de la Pokédex. Monocromo para adaptarse al color activo/inactivo.
export default function PokedexTabIcon({
  size = 24,
  color = '#ffffff',
}: {
  size?: number;
  color?: string;
}) {
  const sw = 1.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Cuerpo del dispositivo */}
      <Rect x={3.5} y={3} width={17} height={18} rx={2.6} stroke={color} strokeWidth={sw} fill="none" />
      {/* Lente grande */}
      <Circle cx={8} cy={7.6} r={2.4} stroke={color} strokeWidth={sw} fill="none" />
      {/* LEDs indicadores */}
      <Circle cx={13.6} cy={6.4} r={0.95} fill={color} />
      <Circle cx={16.4} cy={6.4} r={0.95} fill={color} />
      {/* Pantalla */}
      <Rect x={6} y={12} width={12} height={6.3} rx={1.3} stroke={color} strokeWidth={sw} fill="none" />
    </Svg>
  );
}
