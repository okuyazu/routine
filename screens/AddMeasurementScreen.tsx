/**
 * AddMeasurementScreen.tsx
 * -------------------------------------------------------------
 * Enter a numeric laboratory measurement. This creates an append-only
 * `original` event. We keep the value/unit AS REPORTED and show the
 * NORMALIZED (canonical-unit) value that the engines will actually use.
 */

import React, { useMemo, useState } from 'react';
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
import { PARAMETERS, getParameter } from '../src/parameters';
import { colors, spacing, fontSize, radius } from '../src/theme';
import { num } from '../src/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMeasurement'>;

/** Today's date as YYYY-MM-DD, for the default sample date. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AddMeasurementScreen({ navigation, route }: Props) {
  const { addMeasurement } = useLid();
  const initialKey = route.params?.parameterKey ?? PARAMETERS[0].key;

  const [parameterKey, setParameterKey] = useState(initialKey);
  const def = getParameter(parameterKey)!;

  const [value, setValue] = useState('');
  const [unit, setUnit] = useState(def.acceptedUnits[0].unit);
  const [method, setMethod] = useState('');
  const [sampleDate, setSampleDate] = useState(todayIso());

  // When the parameter changes, reset the unit to that parameter's first.
  function pickParameter(key: string) {
    setParameterKey(key);
    const d = getParameter(key)!;
    setUnit(d.acceptedUnits[0].unit);
  }

  const parsed = Number(value);
  const valid = value.trim() !== '' && !Number.isNaN(parsed) && parsed >= 0;

  const normalized = useMemo(() => {
    if (!valid) return null;
    const conv = def.acceptedUnits.find((u) => u.unit === unit);
    const v = conv ? conv.toCanonical(parsed) : parsed;
    return Math.round(v * 100) / 100;
  }, [valid, def, unit, parsed]);

  function onSave() {
    if (!valid || !/^\d{4}-\d{2}-\d{2}$/.test(sampleDate)) return;
    addMeasurement({
      parameterKey,
      reportedValue: parsed,
      reportedUnit: unit,
      method: method.trim() || undefined,
      sampleDate,
    });
    navigation.goBack();
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Parameter</Text>
      <View style={styles.chipRow}>
        {PARAMETERS.map((p) => (
          <TouchableOpacity
            key={p.key}
            activeOpacity={0.8}
            onPress={() => pickParameter(p.key)}
            style={[styles.chip, parameterKey === p.key && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, parameterKey === p.key && styles.chipTextActive]}
            >
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Reported value</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder={`e.g. 102`}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          autoFocus
        />

        <Text style={styles.label}>Reported unit</Text>
        <View style={styles.chipRow}>
          {def.acceptedUnits.map((u) => (
            <TouchableOpacity
              key={u.unit}
              activeOpacity={0.8}
              onPress={() => setUnit(u.unit)}
              style={[styles.chip, unit === u.unit && styles.chipActive]}
            >
              <Text style={[styles.chipText, unit === u.unit && styles.chipTextActive]}>
                {u.unit}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live normalized preview — reported vs canonical are stored separately */}
        <View style={styles.normalizedBox}>
          <Text style={styles.normalizedLabel}>Normalized for engines</Text>
          <Text style={styles.normalizedValue}>
            {normalized != null ? `${num(normalized)} ${def.canonicalUnit}` : '—'}
          </Text>
        </View>

        <Text style={styles.label}>Method / assay (optional)</Text>
        <TextInput
          style={styles.input}
          value={method}
          onChangeText={setMethod}
          placeholder="e.g. Immunoturbidimetric"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Sample date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={sampleDate}
          onChangeText={setSampleDate}
          placeholder="2026-06-02"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />
      </View>

      {/* Threshold context — the four distinct layers, never conflated */}
      <View style={styles.thresholds}>
        <Text style={styles.thresholdsTitle}>{def.name} — reference points</Text>
        <ThresholdRow
          label="Reference interval"
          value={intervalText(def.referenceInterval, def.canonicalUnit)}
        />
        <ThresholdRow
          label="Guideline target"
          value={def.guidelineTarget != null ? `≤ ${def.guidelineTarget} ${def.canonicalUnit}` : '—'}
        />
        <ThresholdRow
          label="Longevity target"
          value={def.longevityTarget != null ? `≤ ${def.longevityTarget} ${def.canonicalUnit}` : '—'}
        />
        {def.interpretationNote && (
          <Text style={styles.thresholdNote}>{def.interpretationNote}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, !valid && styles.primaryBtnDisabled]}
        activeOpacity={0.85}
        onPress={onSave}
        disabled={!valid}
      >
        <Text style={styles.primaryBtnText}>Save measurement</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Measurements are append-only. Saving adds a new event; it never overwrites an
        existing one. Corrections and retractions are made from the measurement history.
      </Text>
    </ScrollView>
  );
}

function ThresholdRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.thresholdRow}>
      <Text style={styles.thresholdLabel}>{label}</Text>
      <Text style={styles.thresholdValue}>{value}</Text>
    </View>
  );
}

function intervalText(
  interval: [number | null, number | null] | undefined,
  unit: string
): string {
  if (!interval) return '—';
  const [lo, hi] = interval;
  if (lo != null && hi != null) return `${lo}–${hi} ${unit}`;
  if (hi != null) return `≤ ${hi} ${unit}`;
  if (lo != null) return `≥ ${lo} ${unit}`;
  return '—';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
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
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text },
  chipTextActive: { color: colors.textOnPrimary, fontWeight: '700' },
  normalizedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  normalizedLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  normalizedValue: { fontSize: fontSize.lg, color: colors.text, fontWeight: '700' },
  thresholds: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  thresholdsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  thresholdRow: { flexDirection: 'row', justifyContent: 'space-between' },
  thresholdLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  thresholdValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  thresholdNote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
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
