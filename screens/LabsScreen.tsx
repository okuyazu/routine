/**
 * LabsScreen.tsx
 * -------------------------------------------------------------
 * Log blood-panel / vitals markers (blood pressure, cholesterol,
 * glucose, HbA1c, resting heart rate...) and see how each reading
 * compares to its optimal range. BMI is shown too — it's derived
 * from your profile rather than logged here.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useHealth, today } from '../src/HealthContext';
import { Button, Card, ChipGroup, NumberField, Screen } from '../src/ui';
import { LabMarkerId } from '../src/types';
import {
  MARKERS,
  MarkerStatus,
  computeBMI,
  evaluateLabs,
} from '../src/health';
import { colors, fontSize, radius, spacing } from '../src/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Labs'>;

const MARKER_IDS = Object.keys(MARKERS) as LabMarkerId[];

const STATUS_COLOR: Record<MarkerStatus, string> = {
  optimal: colors.good,
  borderline: colors.warn,
  out: colors.bad,
  unknown: colors.textMuted,
};
const STATUS_TEXT: Record<MarkerStatus, string> = {
  optimal: 'In range',
  borderline: 'Borderline',
  out: 'Out of range',
  unknown: '—',
};

export default function LabsScreen({ navigation }: Props) {
  const { data, addLab, removeEntry } = useHealth();
  const [marker, setMarker] = useState<LabMarkerId>('systolicBP');
  const [value, setValue] = useState('');

  const meta = MARKERS[marker];
  const num = parseFloat(value);
  const canAdd = !Number.isNaN(num) && num > 0;

  const results = evaluateLabs(data);
  const bmi = computeBMI(data.profile);

  function submit() {
    if (!canAdd) return;
    addLab({ date: today(), marker, value: num });
    setValue('');
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.cardTitle}>Add a reading</Text>
        <ChipGroup
          label="Marker"
          options={MARKER_IDS}
          value={marker}
          onChange={(m) => setMarker(m)}
          renderLabel={(m) => MARKERS[m].label.replace(/ \(.*\)/, '')}
        />
        <NumberField
          label={`Value (optimal ${meta.optimalText} ${meta.unit})`}
          value={value}
          onChangeText={setValue}
          placeholder={`e.g. value in ${meta.unit}`}
          suffix={meta.unit}
        />
        <Button title="Add reading" onPress={submit} disabled={!canAdd} />
      </Card>

      <Text style={styles.sectionTitle}>Latest results</Text>
      {results.length === 0 ? (
        <Text style={styles.empty}>
          No readings yet. Add markers above, and set height/weight in your{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Profile')}>
            profile
          </Text>{' '}
          to include BMI.
        </Text>
      ) : (
        results.map((r) => (
          <View key={r.meta.id} style={styles.resultRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultLabel}>{r.meta.label}</Text>
              <Text style={styles.resultMeta}>
                Optimal {r.meta.optimalText} {r.meta.unit}
                {r.date !== 'derived' ? ` · ${r.date}` : ' · from profile'}
              </Text>
            </View>
            <View style={styles.resultRight}>
              <Text style={styles.resultValue}>
                {r.value}
                <Text style={styles.resultUnit}> {r.meta.unit}</Text>
              </Text>
              <View
                style={[styles.badge, { backgroundColor: STATUS_COLOR[r.status] + '22' }]}
              >
                <Text style={[styles.badgeText, { color: STATUS_COLOR[r.status] }]}>
                  {STATUS_TEXT[r.status]}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}

      {bmi != null && (
        <Text style={styles.note}>
          BMI {bmi} is calculated from your profile height & weight.
        </Text>
      )}

      <Text style={styles.sectionTitle}>History</Text>
      {data.labs.length === 0 ? (
        <Text style={styles.empty}>Your logged readings will appear here.</Text>
      ) : (
        data.labs.map((e) => (
          <View key={e.id} style={styles.historyRow}>
            <Text style={styles.historyText}>
              {e.date} · {MARKERS[e.marker].label.replace(/ \(.*\)/, '')}: {e.value}{' '}
              {MARKERS[e.marker].unit}
            </Text>
            <TouchableOpacity onPress={() => removeEntry('labs', e.id)}>
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  empty: { color: colors.textMuted, fontSize: fontSize.md, lineHeight: 22 },
  link: { color: colors.primary, fontWeight: '700' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  resultLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  resultMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  resultRight: { alignItems: 'flex-end', gap: 4 },
  resultValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  resultUnit: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { fontSize: fontSize.sm, fontWeight: '700' },
  note: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyText: { flex: 1, fontSize: fontSize.md, color: colors.text },
  delete: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '700' },
});
