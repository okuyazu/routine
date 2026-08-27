/**
 * HomeScreen.tsx
 * -------------------------------------------------------------
 * The "Current State" dashboard — the first screen you see.
 *
 * Phase-1 job: for the active subject, show the ApoB / lipid engine
 * result and the source measurements behind it. Everything here is
 * evidence-backed; there is deliberately NO global longevity score,
 * NO biological age, and NO lifespan estimate.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useLid } from '../src/LidContext';
import { PARAMETERS, getParameter } from '../src/parameters';
import { colors, spacing, fontSize, radius } from '../src/theme';
import { bandColor, bandLabel, formatDate, num } from '../src/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const LIPID_KEYS = PARAMETERS.filter((p) => p.family === 'Lipid').map((p) => p.key);

export default function HomeScreen({ navigation }: Props) {
  const {
    loading,
    activeSubject,
    subjects,
    effectiveEvents,
    latestLipid,
    runLipid,
  } = useLid();

  // Auto-run the lipid engine once when we have a subject but no evaluation,
  // so the dashboard always shows a current, reproducible result.
  useEffect(() => {
    if (!loading && activeSubject && !latestLipid) runLipid();
  }, [loading, activeSubject, latestLipid, runLipid]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!activeSubject) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Header subjectCount={subjects.length} />
        <EmptyState onCreate={() => navigation.navigate('CreateSubject')} />
      </SafeAreaView>
    );
  }

  const apobEffective = effectiveEvents('apob');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Header subjectCount={subjects.length} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Subject line */}
        <View style={styles.subjectRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subjectName}>{activeSubject.name}</Text>
            <Text style={styles.subjectMeta}>
              {activeSubject.sex}
              {activeSubject.birthYear ? ` · b. ${activeSubject.birthYear}` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.switchBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CreateSubject')}
          >
            <Text style={styles.switchText}>Subjects</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Phase-1 output: the Lipid / ApoB evaluation card */}
        <Text style={styles.sectionTitle}>Current state · Lipid family</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.resultCard}
          onPress={() => navigation.navigate('LipidResult')}
        >
          {latestLipid ? (
            <>
              <View style={styles.bandRow}>
                <View
                  style={[styles.bandDot, { backgroundColor: bandColor(latestLipid.band) }]}
                />
                <Text style={[styles.bandLabel, { color: bandColor(latestLipid.band) }]}>
                  {bandLabel(latestLipid.band)}
                </Text>
              </View>
              {latestLipid.primaryValue != null ? (
                <Text style={styles.bigValue}>
                  {num(latestLipid.primaryValue)}
                  <Text style={styles.bigUnit}> {latestLipid.primaryUnit}</Text>
                  <Text style={styles.bigCaption}>  ApoB</Text>
                </Text>
              ) : (
                <Text style={styles.bigValueUnknown}>ApoB — UNKNOWN</Text>
              )}
              <Text style={styles.interpretation}>{latestLipid.interpretation}</Text>
              <Text style={styles.engineTag}>
                {latestLipid.engineName} {latestLipid.engineVersion} · tap for evidence ›
              </Text>
            </>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </TouchableOpacity>

        {/* Source measurements */}
        <Text style={styles.sectionTitle}>Source measurements</Text>
        <View style={styles.card}>
          {LIPID_KEYS.map((key, i) => {
            const def = getParameter(key)!;
            const eff = effectiveEvents(key)[0];
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('MeasurementHistory', { parameterKey: key })}
                style={[styles.paramRow, i > 0 && styles.paramRowBorder]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.paramName}>{def.name}</Text>
                  {eff ? (
                    <Text style={styles.paramMeta}>
                      Sampled {formatDate(eff.sampleDate)}
                      {eff.method ? ` · ${eff.method}` : ''}
                    </Text>
                  ) : (
                    <Text style={styles.paramMetaMuted}>No measurement on record</Text>
                  )}
                </View>
                {eff ? (
                  <Text style={styles.paramValue}>
                    {num(eff.normalizedValue)}{' '}
                    <Text style={styles.paramUnit}>{eff.normalizedUnit}</Text>
                  </Text>
                ) : (
                  <Text style={styles.paramUnknown}>—</Text>
                )}
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {apobEffective.length === 0 && (
          <Text style={styles.hint}>
            No effective ApoB on record, so the lipid engine returns UNKNOWN. Add an
            ApoB measurement to evaluate the family.
          </Text>
        )}

        {/* Invariant footer — this is an evidence system, not a scoreboard. */}
        <Text style={styles.invariants}>
          LID shows evidence, not verdicts. No global longevity score, no biological-age
          number, no lifespan estimate. Missing evidence stays UNKNOWN.
        </Text>
      </ScrollView>

      {/* Actions */}
      <View style={styles.fabRow}>
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary]}
          activeOpacity={0.85}
          onPress={() => runLipid()}
        >
          <Text style={styles.fabSecondaryText}>↻ Re-run engine</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AddMeasurement', {})}
        >
          <Text style={styles.fabText}>+  Add measurement</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Header({ subjectCount }: { subjectCount: number }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.appName}>LID</Text>
        <Text style={styles.appTagline}>Living in Data · Current State</Text>
      </View>
      <View style={styles.phaseBadge}>
        <Text style={styles.phaseText}>Phase 1</Text>
      </View>
    </View>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyEmoji}>🧬</Text>
      <Text style={styles.emptyTitle}>Create a subject</Text>
      <Text style={styles.emptyBody}>
        LID tracks longitudinal, versioned evidence for a subject. Start by creating
        one, then enter numeric lab measurements — beginning with ApoB.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.85} onPress={onCreate}>
        <Text style={styles.emptyBtnText}>Create subject</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appName: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textOnPrimary,
    letterSpacing: 2,
  },
  appTagline: { fontSize: fontSize.sm, color: '#CDE6E6', marginTop: 2 },
  phaseBadge: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  phaseText: { color: '#CDE6E6', fontSize: fontSize.xs, fontWeight: '700' },
  scroll: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },

  subjectRow: { flexDirection: 'row', alignItems: 'center' },
  subjectName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  subjectMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  switchBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchText: { color: colors.primary, fontWeight: '600', fontSize: fontSize.sm },

  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },

  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bandDot: { width: 12, height: 12, borderRadius: 6 },
  bandLabel: { fontSize: fontSize.md, fontWeight: '700' },
  bigValue: { fontSize: 40, fontWeight: '800', color: colors.text },
  bigUnit: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textMuted },
  bigCaption: { fontSize: fontSize.md, fontWeight: '600', color: colors.textMuted },
  bigValueUnknown: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.unknown },
  interpretation: { fontSize: fontSize.md, color: colors.text, lineHeight: 21 },
  engineTag: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  paramRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  paramName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  paramMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  paramMetaMuted: { fontSize: fontSize.xs, color: colors.unknown, marginTop: 2 },
  paramValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  paramUnit: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  paramUnknown: { fontSize: fontSize.lg, color: colors.unknown },
  chevron: { fontSize: 22, color: colors.textMuted, marginLeft: spacing.xs },

  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  invariants: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  fabRow: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fab: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { color: colors.textOnPrimary, fontSize: fontSize.md, fontWeight: '700' },
  fabSecondary: {
    flex: 0.8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  fabSecondaryText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '700' },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
  },
  emptyBtnText: { color: colors.textOnPrimary, fontSize: fontSize.md, fontWeight: '700' },
});
