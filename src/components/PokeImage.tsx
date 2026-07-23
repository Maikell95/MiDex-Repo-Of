import React, { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

// Imagen con cadena de fallbacks: si una URL falla (404), prueba la siguiente.
// Garantiza que siempre se muestre algo (la última suele ser el artwork oficial).
export default function PokeImage({
  sources,
  style,
}: {
  sources: string[];
  style: StyleProp<ImageStyle>;
}) {
  const [i, setI] = useState(0);

  // Si cambian las fuentes (otro Pokémon reciclado en la lista), reiniciamos.
  useEffect(() => {
    setI(0);
  }, [sources[0]]);

  const uri = sources[Math.min(i, sources.length - 1)];

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="contain"
      onError={() => setI((x) => (x < sources.length - 1 ? x + 1 : x))}
    />
  );
}
