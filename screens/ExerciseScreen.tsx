/**
 * ExerciseScreen.tsx
 * -------------------------------------------------------------
 * Log workouts (activity, minutes, intensity). The pillar summary
 * from the dashboard shows how your week stacks up against the
 * 150-minutes-of-moderate-activity guideline.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useHealth, today } from '../src/HealthContext';
import { Button, Card, ChipGroup, NumberField, Screen, TextField } from '../src/ui';
import { ExerciseIntensity } from '../src/types';
import { colors, fontSize, spacing } from '../src/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Exercise'>;

const INTENSITIES: readonly ExerciseIntensity[] = ['light', 'moderate', 'vigorous'];

export default function ExerciseScreen(_props: Props) {
  const { data, summary, addExercise, removeEntry } = useHealth();
  const [activity, setActivity] = useState('');
  const [minutes, setMinutes] = useState('');
  const [intensity, setIntensity] = useState<ExerciseIntensity>('moderate');

  const mins = parseFloat(minutes);
  const canAdd = activity.trim().length > 0 && !Number.isNaN(mins) && mins > 0;
  const pillar = summary.pillars.find((p) => p.key === 'exercise');

  function submit() {
    if (!canAdd) return;
    addExercise({ date: today(), activity: activity.trim(), minutes: mins, intensity });
    setActivity('');
    setMinutes('');
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.cardTitle}>Log a session</Text>
        <TextField
          label="Activity"
          value={activity}
          onChangeText={setActivity}
          placeholder="Run, weights, cycling…"
        />
        <NumberField
          label="Duration"
          value={minutes}
          onChangeText={setMinutes}
          placeholder="30"
          suffix="min"
        />
        <ChipGroup
          label="Intensity"
          options={INTENSITIES}
          value={intensity}
          onChange={setIntensity}
          renderLabel={(i) => i[0].toUpperCase() + i.slice(1)}
        />
        <Button title="Add session" onPress={submit} disabled={!canAdd} />
      </Card>

      {pillar && <Text style={styles.summary}>{pillar.emoji} {pillar.summary}</Text>}

      <Text style={styles.sectionTitle}>Recent sessions</Text>
      {data.exercise.length === 0 ? (
        <Text style={styles.empty}>No sessions logged yet.</Text>
      ) : (
        data.exercise.map((e) => (
          <View key={e.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{e.activity}</Text>
              <Text style={styles.rowMeta}>
                {e.date} · {e.minutes} min · {e.intensity}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeEntry('exercise', e.id)}>
              <Text style={styles.delete}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  summary: { fontSize: fontSize.md, color: colors.textMuted, lineHeight: 22 },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  empty: { color: colors.textMuted, fontSize: fontSize.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  delete: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '700' },
});
