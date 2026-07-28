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
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useConcepts } from '../src/ConceptsContext';
import { usePremium } from '../src/premium';
import { colors, spacing, fontSize, radius } from '../src/theme';
import { GeneratedContent, Concept } from '../src/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ConceptDetail'>;

export default function ConceptDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { getConcept, regenerate, removeConcept } = useConcepts();
  const { isPremium, unlock, lock } = usePremium();
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
    const doDelete = () => {
      removeConcept(id);
      navigation.goBack();
    };

    // React Native's Alert doesn't work in a web browser, so on web we use
    // the browser's built-in confirm dialog instead.
    if (Platform.OS === 'web') {
      const ok = (globalThis as any).confirm?.(`Remove “${concept!.title}”?`);
      if (ok) doDelete();
      return;
    }

    Alert.alert('Delete concept', `Remove “${concept!.title}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
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
        <View style={{ gap: spacing.lg }}>
          <ContentSections content={concept.content} />
          <GoDeeper
            concept={concept}
            isPremium={isPremium}
            onUnlock={unlock}
            onLock={lock}
          />
        </View>
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

/**
 * The premium "Go Deeper" section. Three states:
 *   1. No deep-dive authored yet -> a "coming soon" note.
 *   2. Locked -> a teaser listing what's inside + an unlock button.
 *   3. Unlocked (premium) -> the full deep-dive sections.
 */
function GoDeeper({
  concept,
  isPremium,
  onUnlock,
  onLock,
}: {
  concept: Concept;
  isPremium: boolean;
  onUnlock: () => void;
  onLock: () => void;
}) {
  const deepDive = concept.deepDive;

  // 1. No premium content authored for this concept yet.
  if (!deepDive || deepDive.length === 0) {
    return (
      <View style={styles.comingSoon}>
        <Text style={styles.comingSoonTitle}>🔒 Go Deeper</Text>
        <Text style={styles.comingSoonText}>
          An in-depth deep dive for this concept is coming soon.
        </Text>
      </View>
    );
  }

  // 3. Unlocked — show the full deep dive.
  if (isPremium) {
    return (
      <View style={{ gap: spacing.lg }}>
        <View style={styles.unlockedHeader}>
          <Text style={styles.sectionTitle}>Go Deeper</Text>
          <Text style={styles.premiumTag}>✓ Premium</Text>
        </View>
        {deepDive.map((s, i) => (
          <Section key={i} title={s.heading}>
            <Text style={styles.paragraph}>{s.body}</Text>
          </Section>
        ))}
        <TouchableOpacity onPress={onLock}>
          <Text style={styles.relock}>🔒 Lock again (for testing)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. Locked — teaser + unlock button.
  return (
    <View style={styles.paywall}>
      <Text style={styles.paywallTitle}>🔒 Go Deeper</Text>
      <Text style={styles.paywallPitch}>
        Unlock the in-depth deep dive for {concept.title}:
      </Text>
      <View style={styles.paywallList}>
        {deepDive.map((s, i) => (
          <Text key={i} style={styles.paywallItem}>
            •  {s.heading}
          </Text>
        ))}
      </View>
      <TouchableOpacity
        style={styles.unlockBtn}
        activeOpacity={0.85}
        onPress={onUnlock}
      >
        <Text style={styles.unlockBtnText}>Unlock deep dive</Text>
      </TouchableOpacity>
      <Text style={styles.paywallNote}>
        Demo build — no charge. In the finished app this opens the App Store /
        Google Play purchase.
      </Text>
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

  // --- "Go Deeper" premium section ---
  comingSoon: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comingSoonTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  comingSoonText: { fontSize: fontSize.md, color: colors.textMuted },
  unlockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumTag: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  relock: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  paywall: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  paywallTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paywallPitch: { fontSize: fontSize.md, color: colors.textMuted },
  paywallList: { marginVertical: spacing.md, gap: spacing.xs },
  paywallItem: { fontSize: fontSize.md, color: colors.text },
  unlockBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  unlockBtnText: {
    color: '#3A2E00',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  paywallNote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
});
