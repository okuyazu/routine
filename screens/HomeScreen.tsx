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
import { colors, spacing, fontSize, radius } from '../src/theme';
import { Concept } from '../src/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { concepts, loading } = useConcepts();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Philosophy</Text>
        <Text style={styles.subtitle}>Your concepts, taught by AI</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : concepts.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={concepts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ConceptCard
              concept={item}
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

/** A single row/card in the list. */
function ConceptCard({
  concept,
  onPress,
}: {
  concept: Concept;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{concept.title}</Text>
        <Text style={styles.cardMeta}>{statusLabel(concept)}</Text>
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
function EmptyState() {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyEmoji}>🏛️</Text>
      <Text style={styles.emptyTitle}>Start your library</Text>
      <Text style={styles.emptyBody}>
        Add any philosophical concept — like “Stoicism” or “the meaning of
        life” — and get a lesson, key ideas, and practical points.
      </Text>
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
