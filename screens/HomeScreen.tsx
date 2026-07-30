/**
 * HomeScreen.tsx
 * -------------------------------------------------------------
 * The first screen you see: your library of concepts.
 * - Shows each concept as a tappable card.
 * - A "+ Add concept" button opens the Add screen.
 * - Empty state guides a first-time user.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useConcepts } from '../src/ConceptsContext';
import { useProgress, cardKeyOf } from '../src/progress';
import { colors, spacing, fontSize, radius } from '../src/theme';
import { Concept } from '../src/types';

/** All spaced-repetition card keys for a concept. */
function keysFor(concept: Concept): string[] {
  return (concept.flashcards ?? []).map((f) => cardKeyOf(concept.title, f.front));
}

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { concepts, loading } = useConcepts();
  const { streak, masteryOf, dueCount } = useProgress();

  // Overall progress across every saved concept's flashcards.
  const allKeys = concepts.flatMap(keysFor);
  const overall = masteryOf(allKeys);
  const due = dueCount(allKeys);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Philosophy</Text>
        <Text style={styles.subtitle}>Your personal library</Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Library')}
        >
          <Text style={styles.actionBtnText}>📚 Browse library</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Review', {})}
        >
          <Text style={styles.actionBtnText}>🎴 Quiz</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : concepts.length === 0 ? (
        <EmptyState onBrowse={() => navigation.navigate('Library')} />
      ) : (
        <FlatList
          data={concepts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            allKeys.length > 0 ? (
              <StatsBanner
                streak={streak}
                mastered={overall.mastered}
                total={overall.total}
                due={due}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <ConceptCard
              concept={item}
              mastery={masteryOf(keysFor(item))}
              onPress={() => navigation.navigate('ConceptDetail', { id: item.id })}
            />
          )}
        />
      )}

      {/* Floating add button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddConcept')}
      >
        <Text style={styles.fabText}>+  Add concept</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/** A small progress dashboard shown above the concept list. */
function StatsBanner({
  streak,
  mastered,
  total,
  due,
}: {
  streak: number;
  mastered: number;
  total: number;
  due: number;
}) {
  return (
    <View style={styles.stats}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>🔥 {streak}</Text>
        <Text style={styles.statLabel}>day streak</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>
          {mastered}/{total}
        </Text>
        <Text style={styles.statLabel}>mastered</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{due}</Text>
        <Text style={styles.statLabel}>due now</Text>
      </View>
    </View>
  );
}

/** A single row/card in the list. */
function ConceptCard({
  concept,
  mastery,
  onPress,
}: {
  concept: Concept;
  mastery: { mastered: number; total: number };
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{concept.title}</Text>
        <Text style={styles.cardMeta}>{statusLabel(concept)}</Text>
        {mastery.total > 0 && (
          <Text style={styles.cardMastery}>
            🎴 {mastery.mastered}/{mastery.total} cards mastered
          </Text>
        )}
      </View>
      {concept.status === 'generating' && (
        <ActivityIndicator color={colors.primary} />
      )}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function statusLabel(concept: Concept): string {
  if (concept.status === 'generating') return 'Generating lesson…';
  if (concept.status === 'error') return 'Tap to retry';
  if (concept.content) return concept.content.summary;
  return 'Ready';
}

/** Shown when the user has no concepts yet. */
function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyEmoji}>🏛️</Text>
      <Text style={styles.emptyTitle}>Start your library</Text>
      <Text style={styles.emptyBody}>
        Browse the built-in library of great concepts, or add any concept of
        your own — each comes with a lesson, key ideas, and practical points.
      </Text>
      <TouchableOpacity
        style={styles.emptyBrowseBtn}
        activeOpacity={0.85}
        onPress={onBrowse}
      >
        <Text style={styles.emptyBrowseText}>📚 Browse the library</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, marginTop: 2 },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  actionBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
  list: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  cardMeta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardMastery: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  chevron: { fontSize: 26, color: colors.textMuted, marginLeft: spacing.xs },
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
  emptyBrowseBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
  },
  emptyBrowseText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
