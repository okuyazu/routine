/**
 * MeasurementHistoryScreen.tsx
 * -------------------------------------------------------------
 * The append-only event log for one parameter.
 *
 * Every entry ever made is shown, newest first — originals, corrections,
 * and retractions. Corrections and retractions are NEW events that point
 * back at the one they supersede; the original is never deleted. The event
 * that currently "counts" is flagged as Effective.
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
import { getParameter } from '../src/parameters';
import { colors, spacing, fontSize, radius } from '../src/theme';
import {
  eventTypeColor,
  eventTypeLabel,
  formatDate,
  formatDateTime,
  num,
} from '../src/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'MeasurementHistory'>;

export default function MeasurementHistoryScreen({ navigation, route }: Props) {
  const { parameterKey } = route.params;
  const def = getParameter(parameterKey);
  const { eventsForParameter, effectiveEvents, correctMeasurement, retractMeasurement } =
    useLid();

  const events = eventsForParameter(parameterKey);
  const effective = effectiveEvents(parameterKey);
  const effectiveIds = new Set(effective.map((e) => e.id));
  const currentEffective = effective[0];

  // Inline correction form state.
  const [correcting, setCorrecting] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [note, setNote] = useState('');

  function submitCorrection() {
    if (!currentEffective) return;
    const v = Number(newValue);
    if (Number.isNaN(v) || newValue.trim() === '') return;
    correctMeasurement(currentEffective.id, v, currentEffective.reportedUnit, note.trim() || undefined);
    setCorrecting(false);
    setNewValue('');
    setNote('');
  }

  function submitRetraction() {
    if (!currentEffective) return;
    retractMeasurement(currentEffective.id, 'Retracted from measurement history.');
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{def?.name ?? parameterKey}</Text>
      <Text style={styles.subtitle}>
        {events.length} event{events.length === 1 ? '' : 's'} · append-only history
      </Text>

      {events.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.muted}>No measurements recorded for this parameter yet.</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AddMeasurement', { parameterKey })}
          >
            <Text style={styles.primaryBtnText}>Add {def?.name ?? 'measurement'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Timeline */}
      <View style={{ gap: spacing.sm }}>
        {events.map((m) => {
          const isEffective = effectiveIds.has(m.id);
          const superseded = !!m.supersedesEventId;
          return (
            <View
              key={m.id}
              style={[styles.eventCard, isEffective && styles.eventCardEffective]}
            >
              <View style={styles.eventHeader}>
                <View
                  style={[styles.typeBadge, { backgroundColor: eventTypeColor(m.eventType) }]}
                >
                  <Text style={styles.typeBadgeText}>{eventTypeLabel(m.eventType)}</Text>
                </View>
                {isEffective && <Text style={styles.effectiveTag}>Effective</Text>}
                {m.eventType === 'retraction' && (
                  <Text style={styles.retractedTag}>Withdrawn</Text>
                )}
              </View>

              <Text style={[styles.eventValue, m.eventType === 'retraction' && styles.strike]}>
                {num(m.reportedValue)} {m.reportedUnit}
                {m.reportedUnit !== m.normalizedUnit && (
                  <Text style={styles.eventNorm}>
                    {'  →  '}
                    {num(m.normalizedValue)} {m.normalizedUnit}
                  </Text>
                )}
              </Text>

              <Text style={styles.eventMeta}>Sampled {formatDate(m.sampleDate)}</Text>
              {m.method && <Text style={styles.eventMeta}>Method · {m.method}</Text>}
              <Text style={styles.eventMeta}>Entered {formatDateTime(m.enteredAt)}</Text>
              {superseded && (
                <Text style={styles.eventMetaMuted}>
                  Supersedes {m.supersedesEventId}
                </Text>
              )}
              {m.note && <Text style={styles.eventNote}>“{m.note}”</Text>}
            </View>
          );
        })}
      </View>

      {/* Actions on the current effective value */}
      {currentEffective && (
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Amend the effective value</Text>
          <Text style={styles.actionsHelp}>
            Both actions add a NEW event. The original stays on record.
          </Text>

          {correcting ? (
            <View style={{ gap: spacing.sm }}>
              <TextInput
                style={styles.input}
                value={newValue}
                onChangeText={setNewValue}
                placeholder={`Corrected value (${currentEffective.reportedUnit})`}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
              />
              <TextInput
                style={styles.input}
                value={note}
                onChangeText={setNote}
                placeholder="Reason (optional)"
                placeholderTextColor={colors.textMuted}
              />
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.smallBtnGhost]}
                  onPress={() => setCorrecting(false)}
                >
                  <Text style={styles.smallBtnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallBtn} onPress={submitCorrection}>
                  <Text style={styles.smallBtnText}>Save correction</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.smallBtn, styles.smallBtnGhost]}
                onPress={() => setCorrecting(true)}
              >
                <Text style={styles.smallBtnGhostText}>Correct value</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, styles.smallBtnDanger]}
                onPress={submitRetraction}
              >
                <Text style={styles.smallBtnText}>Retract</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: -spacing.sm },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  muted: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },

  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  eventCardEffective: { borderColor: colors.primary, borderWidth: 2 },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  typeBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  typeBadgeText: { color: colors.textOnPrimary, fontSize: fontSize.xs, fontWeight: '700' },
  effectiveTag: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  retractedTag: { fontSize: fontSize.xs, fontWeight: '700', color: colors.high },
  eventValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  eventNorm: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  strike: { textDecorationLine: 'line-through', color: colors.textMuted },
  eventMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  eventMetaMuted: { fontSize: 10, color: colors.unknown, marginTop: 1, fontFamily: 'Courier' },
  eventNote: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },

  actionsCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  actionsTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  actionsHelp: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  smallBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  smallBtnText: { color: colors.textOnPrimary, fontSize: fontSize.sm, fontWeight: '700' },
  smallBtnGhost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallBtnGhostText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
  smallBtnDanger: { backgroundColor: colors.high },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.textOnPrimary, fontSize: fontSize.md, fontWeight: '700' },
});
