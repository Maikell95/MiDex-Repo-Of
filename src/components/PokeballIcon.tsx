import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';

// Silueta de Poké Ball (líneas) para usar como marca de agua / motivo decorativo.
export default function PokeballIcon({
  size = 100,
  color = '#ffffff',
  opacity = 1,
}: {
  size?: number;
  color?: string;
  opacity?: number;
}) {
  const c = 50;
  const r = 44;
  const sw = 6;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <Circle cx={c} cy={c} r={r} stroke={color} strokeWidth={sw} fill="none" />
      <Line x1={c - r} y1={c} x2={c + r} y2={c} stroke={color} strokeWidth={sw} />
      <Circle cx={c} cy={c} r={15} stroke={color} strokeWidth={sw} fill="none" />
      <Circle cx={c} cy={c} r={5} fill={color} />
    </Svg>
  );
}
