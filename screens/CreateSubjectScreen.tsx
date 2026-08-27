/**
 * CreateSubjectScreen.tsx
 * -------------------------------------------------------------
 * Create a new subject, and switch between existing ones. A subject is
 * the person whose longitudinal evidence LID tracks (in the real system,
 * subject-specific `lid_user` data — kept separate from global knowledge).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useLid } from '../src/LidContext';
import { Sex } from '../src/types';
import { colors, spacing, fontSize, radius } from '../src/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateSubject'>;

const SEXES: Sex[] = ['female', 'male', 'intersex', 'unspecified'];

export default function CreateSubjectScreen({ navigation }: Props) {
  const { subjects, activeSubjectId, setActiveSubject, createSubject } = useLid();
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [sex, setSex] = useState<Sex>('unspecified');

  const canCreate = name.trim().length > 0;

  function onCreate() {
    if (!canCreate) return;
    const birthYear = /^\d{4}$/.test(year.trim()) ? Number(year.trim()) : undefined;
    createSubject(name, sex, birthYear);
    navigation.goBack();
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {subjects.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Subjects</Text>
          <View style={styles.card}>
            {subjects.map((s, i) => {
              const active = s.id === activeSubjectId;
              return (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    setActiveSubject(s.id);
                    navigation.goBack();
                  }}
                  style={[styles.subjectRow, i > 0 && styles.rowBorder]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{s.name}</Text>
                    <Text style={styles.subjectMeta}>
                      {s.sex}
                      {s.birthYear ? ` · b. ${s.birthYear}` : ''}
                    </Text>
                  </View>
                  {active && <Text style={styles.activeTag}>Active</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>New subject</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Name or label</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Subject A"
          placeholderTextColor={colors.textMuted}
          autoFocus
        />

        <Text style={styles.label}>Birth year (optional)</Text>
        <TextInput
          style={styles.input}
          value={year}
          onChangeText={setYear}
          placeholder="e.g. 1985"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={4}
        />

        <Text style={styles.label}>Sex at birth</Text>
        <View style={styles.chipRow}>
          {SEXES.map((s) => (
            <TouchableOpacity
              key={s}
              activeOpacity={0.8}
              onPress={() => setSex(s)}
              style={[styles.chip, sex === s && styles.chipActive]}
            >
              <Text style={[styles.chipText, sex === s && styles.chipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, !canCreate && styles.primaryBtnDisabled]}
        activeOpacity={0.85}
        onPress={onCreate}
        disabled={!canCreate}
      >
        <Text style={styles.primaryBtnText}>Create subject</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Subject data is stored only on this device for the mockup. In production,
        subjects live in row-level-secured, per-user storage — isolated from every
        other subject.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  subjectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  subjectName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  subjectMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  activeTag: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.optimal,
    backgroundColor: '#E1F0E9',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text },
  chipTextActive: { color: colors.textOnPrimary, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: colors.surfaceAlt },
  primaryBtnText: { color: colors.textOnPrimary, fontSize: fontSize.md, fontWeight: '700' },
  note: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18 },
});
