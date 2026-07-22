/**
 * ConceptDetailScreen.tsx
 * -------------------------------------------------------------
 * Shows one concept's generated content in three sections:
 *   • Lesson
 *   • Key Ideas
 *   • Practical Points
 * Handles all three states: generating (spinner), error (retry),
 * and ready (the content). Also lets the user delete the concept.
 */

import React, { useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useConcepts } from '../src/ConceptsContext';
import { colors, spacing, fontSize, radius } from '../src/theme';
import { GeneratedContent } from '../src/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ConceptDetail'>;

export default function ConceptDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { getConcept, regenerate, removeConcept } = useConcepts();
  const concept = getConcept(id);

  // Put the concept title in the navigation bar.
  useLayoutEffect(() => {
    navigation.setOptions({ title: concept?.title ?? 'Concept' });
  }, [navigation, concept?.title]);

  // If the concept was deleted (or id is unknown), go back safely.
  useEffect(() => {
    if (!concept) navigation.goBack();
  }, [concept, navigation]);

  if (!concept) return null;

  function confirmDelete() {
    Alert.alert('Delete concept', `Remove “${concept!.title}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeConcept(id);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      {concept.content?.summary && (
        <Text style={styles.summary}>{concept.content.summary}</Text>
      )}

      {concept.status === 'generating' && <GeneratingState />}

      {concept.status === 'error' && (
        <ErrorState message={concept.error} onRetry={() => regenerate(id)} />
      )}

      {concept.status === 'ready' && concept.content && (
        <ContentSections content={concept.content} />
      )}

      <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
        <Text style={styles.deleteText}>Delete concept</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function GeneratingState() {
  return (
    <View style={styles.stateBox}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.stateText}>Generating your lesson…</Text>
    </View>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.stateBox}>
      <Text style={styles.errorTitle}>Couldn’t generate this</Text>
      <Text style={styles.stateText}>{message ?? 'Please try again.'}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function ContentSections({ content }: { content: GeneratedContent }) {
  return (
    <View style={{ gap: spacing.lg }}>
      <Section title="Lesson">
        <Text style={styles.paragraph}>{content.lesson}</Text>
      </Section>

      <Section title="Key Ideas">
        {content.keyIdeas.map((idea, i) => (
          <BulletRow key={i} text={idea} />
        ))}
      </Section>

      <Section title="Practical Points">
        {content.practicalPoints.map((point, i) => (
          <BulletRow key={i} text={point} accent />
        ))}
      </Section>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}

function BulletRow({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <View style={styles.bulletRow}>
      <View
        style={[styles.bulletDot, accent && { backgroundColor: colors.accent }]}
      />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  summary: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontStyle: 'italic',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  stateText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.danger,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  retryText: { color: colors.textOnPrimary, fontWeight: '600' },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 24,
  },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  deleteBtn: {
    marginTop: spacing.xl,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  deleteText: { color: colors.danger, fontSize: fontSize.md },
});
