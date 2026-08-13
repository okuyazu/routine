/**
 * SleepScreen.tsx
 * -------------------------------------------------------------
 * Log a night's sleep: hours and a quality rating. The pillar
 * favours a consistent 7–8 hours with good quality.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useHealth, today } from '../src/HealthContext';
import { Button, Card, ChipGroup, NumberField, Screen } from '../src/ui';
import { colors, fontSize, spacing } from '../src/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Sleep'>;

const RATINGS = [1, 2, 3, 4, 5] as const;

export default function SleepScreen(_props: Props) {
  const { data, summary, addSleep, removeEntry } = useHealth();
  const [hours, setHours] = useState('');
  const [quality, setQuality] = useState<number>(3);

  const hrs = parseFloat(hours);
  const canAdd = !Number.isNaN(hrs) && hrs > 0 && hrs <= 24;
  const pillar = summary.pillars.find((p) => p.key === 'sleep');

  function submit() {
    if (!canAdd) return;
    addSleep({ date: today(), hours: hrs, quality });
    setHours('');
    setQuality(3);
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.cardTitle}>Log last night</Text>
        <NumberField
          label="Hours slept"
          value={hours}
          onChangeText={setHours}
          placeholder="7.5"
          suffix="hrs"
        />
        <ChipGroup
          label="Quality (1 poor – 5 excellent)"
          options={RATINGS}
          value={quality}
          onChange={setQuality}
        />
        <Button title="Add night" onPress={submit} disabled={!canAdd} />
      </Card>

      {pillar && <Text style={styles.summary}>{pillar.emoji} {pillar.summary}</Text>}

      <Text style={styles.sectionTitle}>Recent nights</Text>
      {data.sleep.length === 0 ? (
        <Text style={styles.empty}>No nights logged yet.</Text>
      ) : (
        data.sleep.map((e) => (
          <View key={e.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{e.hours} hours</Text>
              <Text style={styles.rowMeta}>
                {e.date} · quality {e.quality}/5
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeEntry('sleep', e.id)}>
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
