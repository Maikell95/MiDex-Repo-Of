import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatLabel } from '../api/competitive';
import PokeImage from '../components/PokeImage';
import ScreenBackground from '../components/ScreenBackground';
import type { TeamStackParamList } from '../navigation';
import { deleteTeam, loadTeams, newTeam, upsertTeam, type SavedTeam } from '../team';
import { colors } from '../theme';
import { spriteCandidates } from '../utils';

type Props = NativeStackScreenProps<TeamStackParamList, 'Team'>;

export default function TeamListScreen({ navigation }: Props) {
  const [teams, setTeams] = useState<SavedTeam[]>([]);
  const [pendingDelete, setPendingDelete] = useState<SavedTeam | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadTeams().then(setTeams);
    }, []),
  );

  const create = async () => {
    const t = newTeam();
    await upsertTeam(t);
    navigation.navigate('TeamEdit', { teamId: t.id });
  };

  const doDelete = async () => {
    if (!pendingDelete) return;
    setTeams(await deleteTeam(pendingDelete.id));
    setPendingDelete(null);
  };

  return (
    <ScreenBackground>
      <Pressable style={styles.newBtn} onPress={create}>
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.newText}>Nuevo equipo</Text>
      </Pressable>
      <FlatList
        data={teams}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Aún no tienes equipos. Crea uno con “Nuevo equipo”.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => navigation.navigate('TeamEdit', { teamId: item.id })}
            onLongPress={() => setPendingDelete(item)}
          >
            <View style={styles.cardHead}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <View style={styles.fmt}>
                <Text style={styles.fmtText}>{formatLabel(item.format)}</Text>
              </View>
            </View>
            <View style={styles.sprites}>
              {item.members.length ? (
                item.members.map((m) => (
                  <PokeImage key={m.id} sources={spriteCandidates(m.entry)} style={styles.sprite} />
                ))
              ) : (
                <Text style={styles.dim}>Equipo vacío</Text>
              )}
            </View>
          </Pressable>
        )}
      />

      {/* Confirmación de borrado (estilo de la app) */}
      <Modal visible={!!pendingDelete} transparent animationType="fade" onRequestClose={() => setPendingDelete(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPendingDelete(null)}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            <View style={styles.dialogIcon}>
              <Ionicons name="trash" size={26} color={colors.accent} />
            </View>
            <Text style={styles.dialogTitle}>Borrar equipo</Text>
            <Text style={styles.dialogMsg}>
              ¿Seguro que quieres borrar “{pendingDelete?.name}”? Esta acción no se puede deshacer.
            </Text>
            <View style={styles.dialogBtns}>
              <Pressable style={[styles.dialogBtn, styles.cancelBtn]} onPress={() => setPendingDelete(null)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.dialogBtn, styles.deleteBtn]} onPress={doDelete}>
                <Text style={styles.deleteText}>Borrar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    margin: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  newText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 30, paddingHorizontal: 24 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 12,
  },
  cardPressed: { opacity: 0.7 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  name: { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 },
  fmt: { backgroundColor: colors.cardAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  fmtText: { color: colors.textDim, fontSize: 11, fontWeight: '800' },
  sprites: { flexDirection: 'row', flexWrap: 'wrap' },
  sprite: { width: 44, height: 44 },
  dim: { color: colors.textDim, fontSize: 13, fontStyle: 'italic' },

  backdrop: { flex: 1, backgroundColor: '#000b', alignItems: 'center', justifyContent: 'center', padding: 28 },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: 'center',
  },
  dialogIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dialogTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 6 },
  dialogMsg: { color: colors.textDim, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 18 },
  dialogBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  dialogBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.text, fontWeight: '800', fontSize: 15 },
  deleteBtn: { backgroundColor: colors.accent },
  deleteText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
