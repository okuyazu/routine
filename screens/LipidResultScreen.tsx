/**
 * LipidResultScreen.tsx
 * -------------------------------------------------------------
 * The persisted lipid engine evaluation, in full — the auditable record.
 *
 * Shows the band + ApoB value, the engine's exact name and version, the
 * input snapshot it saw, and the source measurement events that fed it.
 * A result is only trustworthy if it is reproducible: same snapshot +
 * same engine version => same output.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  DimensionValue,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useLid } from '../src/LidContext';
import { getParameter } from '../src/parameters';
import { colors, spacing, fontSize, radius } from '../src/theme';
import { bandColor, bandLabel, formatDate, formatDateTime, num } from '../src/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'LipidResult'>;

export default function LipidResultScreen({ navigation }: Props) {
  const { latestLipid, measurements, runLipid } = useLid();

  if (!latestLipid) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No evaluation yet</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => runLipid()}>
          <Text style={styles.primaryBtnText}>Run lipid engine</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const e = latestLipid;
  const apob = getParameter('apob')!;
  const sourceEvents = measurements.filter((m) => e.sourceEventIds.includes(m.id));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Headline band */}
      <View style={styles.card}>
        <View style={styles.bandRow}>
          <View style={[styles.bandDot, { backgroundColor: bandColor(e.band) }]} />
          <Text style={[styles.bandLabel, { color: bandColor(e.band) }]}>
            {bandLabel(e.band)}
          </Text>
        </View>
        {e.primaryValue != null ? (
          <Text style={styles.bigValue}>
            {num(e.primaryValue)}
            <Text style={styles.bigUnit}> {e.primaryUnit}</Text>
            <Text style={styles.bigCaption}>  ApoB</Text>
          </Text>
        ) : (
          <Text style={styles.unknownValue}>ApoB — UNKNOWN</Text>
        )}
        <Text style={styles.interpretation}>{e.interpretation}</Text>
      </View>

      {/* The four distinct reference layers, visualized */}
      {e.primaryValue != null && (
        <ApoBScale value={e.primaryValue} />
      )}

      {/* Engine provenance */}
      <Text style={styles.sectionTitle}>Engine</Text>
      <View style={styles.card}>
        <Row label="Name" value={e.engineName} mono />
        <Row label="Version" value={e.engineVersion} mono />
        <Row label="Evaluated" value={formatDateTime(e.createdAt)} />
      </View>

      {/* Input snapshot — exactly what the engine saw */}
      <Text style={styles.sectionTitle}>Input snapshot</Text>
      <View style={styles.card}>
        {Object.entries(e.inputSnapshot).map(([k, v], i) => (
          <Row key={k} label={k} value={v === null ? 'null' : String(v)} mono border={i > 0} />
        ))}
      </View>

      {/* Source measurements */}
      <Text style={styles.sectionTitle}>Source measurements</Text>
      {sourceEvents.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.muted}>
            No source measurement — the engine returned UNKNOWN from missing evidence.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          {sourceEvents.map((m, i) => {
            const def = getParameter(m.parameterKey);
            return (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('MeasurementHistory', { parameterKey: m.parameterKey })
                }
                style={[styles.sourceRow, i > 0 && styles.rowBorder]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sourceName}>{def?.name ?? m.parameterKey}</Text>
                  <Text style={styles.sourceMeta}>
                    Reported {num(m.reportedValue)} {m.reportedUnit} · sampled{' '}
                    {formatDate(m.sampleDate)}
                    {m.method ? ` · ${m.method}` : ''}
                  </Text>
                </View>
                <Text style={styles.sourceValue}>
                  {num(m.normalizedValue)} {m.normalizedUnit}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => runLipid()}>
        <Text style={styles.primaryBtnText}>↻ Re-run engine on current evidence</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        {apob.interpretationNote}
      </Text>
    </ScrollView>
  );
}

/**
 * A simple horizontal scale placing the ApoB value against its three
 * layered thresholds — making "in range ≠ at target" visible at a glance.
 */
function ApoBScale({ value }: { value: number }) {
  const apob = getParameter('apob')!;
  const longevity = apob.longevityTarget ?? 60;
  const guideline = apob.guidelineTarget ?? 90;
  const refHigh = apob.referenceInterval?.[1] ?? 125;
  const max = Math.max(refHigh * 1.2, value * 1.1);
  const pct = (v: number): DimensionValue =>
    `${Math.min(100, (v / max) * 100)}%` as DimensionValue;

  return (
    <View style={styles.scaleCard}>
      <Text style={styles.scaleTitle}>ApoB against its reference layers (mg/dL)</Text>
      <View style={styles.scaleTrack}>
        {/* Colored zones */}
        <View style={[styles.zone, { left: 0, width: pct(longevity), backgroundColor: '#DCEFE7' }]} />
        <View
          style={[
            styles.zone,
            { left: pct(longevity), width: pct(guideline - longevity), backgroundColor: '#DCE8F0' },
          ]}
        />
        <View
          style={[
            styles.zone,
            { left: pct(guideline), width: pct(refHigh - guideline), backgroundColor: '#F3E8D2' },
          ]}
        />
        <View
          style={[
            styles.zone,
            { left: pct(refHigh), right: 0, backgroundColor: '#F2DAD3' },
          ]}
        />
        {/* Value marker */}
        <View style={[styles.marker, { left: pct(value) }]} />
      </View>
      <View style={styles.scaleLabels}>
        <ScaleTick pct={pct(longevity)} label={`Longevity ${longevity}`} />
        <ScaleTick pct={pct(guideline)} label={`Guideline ${guideline}`} />
        <ScaleTick pct={pct(refHigh)} label={`Ref ${refHigh}`} />
      </View>
      <Text style={styles.scaleValueLabel}>▲ ApoB {num(value)}</Text>
    </View>
  );
}

function ScaleTick({ pct, label }: { pct: DimensionValue; label: string }) {
  return (
    <Text style={[styles.scaleTick, { left: pct }]} numberOfLines={1}>
      {label}
    </Text>
  );
}

function Row({
  label,
  value,
  mono,
  border,
}: {
  label: string;
  value: string;
  mono?: boolean;
  border?: boolean;
}) {
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bandDot: { width: 12, height: 12, borderRadius: 6 },
  bandLabel: { fontSize: fontSize.md, fontWeight: '700' },
  bigValue: { fontSize: 40, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  bigUnit: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textMuted },
  bigCaption: { fontSize: fontSize.md, fontWeight: '600', color: colors.textMuted },
  unknownValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.unknown,
    marginTop: spacing.sm,
  },
  interpretation: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 21,
    marginTop: spacing.sm,
  },

  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted, flexShrink: 1 },
  rowValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  mono: { fontFamily: 'Courier', fontSize: fontSize.sm },

  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  sourceName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  sourceMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  sourceValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  chevron: { fontSize: 22, color: colors.textMuted },
  muted: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },

  scaleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  scaleTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  scaleTrack: {
    height: 18,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    position: 'relative',
  },
  zone: { position: 'absolute', top: 0, bottom: 0 },
  marker: {
    position: 'absolute',
    top: -4,
    width: 3,
    height: 26,
    backgroundColor: colors.text,
    borderRadius: 2,
  },
  scaleLabels: { height: 24, position: 'relative', marginTop: spacing.xs },
  scaleTick: {
    position: 'absolute',
    fontSize: 9,
    color: colors.textMuted,
    transform: [{ translateX: -20 }],
    width: 60,
    textAlign: 'center',
  },
  scaleValueLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },

  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: colors.textOnPrimary, fontSize: fontSize.md, fontWeight: '700' },
  note: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18 },
});
