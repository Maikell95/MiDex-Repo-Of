import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import {
  ITEM_COLS,
  ITEM_ICON,
  ITEM_SHEET,
  ITEM_SHEET_H,
  ITEM_SHEET_W,
  itemSpriteUrl,
} from '../api/items';

// Icono del objeto: 1) hoja de Showdown por spritenum; 2) sprite de PokéAPI; 3) placeholder.
export default function ItemIcon({
  spritenum,
  slug,
  size = 32,
}: {
  spritenum?: number;
  slug: string;
  size?: number;
}) {
  const [err, setErr] = useState(false);
  const box = { width: size, height: size };

  if (spritenum != null) {
    const scale = size / ITEM_ICON;
    const col = spritenum % ITEM_COLS;
    const row = Math.floor(spritenum / ITEM_COLS);
    return (
      <View style={[box, styles.clip]}>
        <Image
          source={{ uri: ITEM_SHEET }}
          style={{
            position: 'absolute',
            width: ITEM_SHEET_W * scale,
            height: ITEM_SHEET_H * scale,
            left: -(col * ITEM_ICON * scale),
            top: -(row * ITEM_ICON * scale),
          }}
          resizeMode="stretch"
        />
      </View>
    );
  }
  if (!err) {
    return (
      <Image source={{ uri: itemSpriteUrl(slug) }} style={box} resizeMode="contain" onError={() => setErr(true)} />
    );
  }
  return <View style={box} />;
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });
