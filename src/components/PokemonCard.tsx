import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typeColor } from '../theme';
import type { DexEntry } from '../types';
import { dexNumber, spriteCandidates } from '../utils';
import PokeballIcon from './PokeballIcon';
import PokeImage from './PokeImage';
import TierBadge from './TierBadge';
import TypeBadge from './TypeBadge';

interface Props {
  id: string;
  entry: DexEntry;
  onPress: (id: string, entry: DexEntry) => void;
}

// Tarjeta memoizada: solo se re-renderiza si cambia el id (mejora el rendimiento
// de la lista de ~1025 Pokémon).
function PokemonCard({ id, entry, onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const tint = typeColor(entry.types[0]);

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable
      style={styles.pressable}
      onPress={() => onPress(id, entry)}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        {/* Fondo estilo "ficha de Pokédex": degradado con el color del tipo */}
        <LinearGradient
          colors={[tint + '33', colors.card, colors.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Poké Ball tenue detrás del sprite */}
        <View pointerEvents="none" style={styles.ball}>
          <PokeballIcon size={104} color={tint} opacity={0.16} />
        </View>

        <View style={styles.cardHeader}>
          <Text style={styles.num}>{dexNumber(entry.num)}</Text>
          <TierBadge tier={entry.tier} />
        </View>
        <PokeImage sources={spriteCandidates(entry)} style={styles.sprite} />
        <Text style={styles.name} numberOfLines={1}>{entry.name}</Text>
        <View style={styles.types}>
          {entry.types.map((t) => (
            <TypeBadge key={t} type={t} small />
          ))}
        </View>
        <View style={[styles.accent, { backgroundColor: tint }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  ball: { position: 'absolute', top: 18, right: -18 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  num: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  sprite: { width: '100%', height: 96, marginVertical: 4 },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  types: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
});

// React.memo con comparación por id: evita re-renderizar tarjetas que no cambian.
export default React.memo(PokemonCard, (a, b) => a.id === b.id);
