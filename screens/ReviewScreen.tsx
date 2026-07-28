/**
 * ReviewScreen.tsx
 * -------------------------------------------------------------
 * Flashcard review / quiz mode. Two ways in:
 *   • With a `conceptId`  -> review just that concept's cards (FREE).
 *   • Without one         -> mixed quiz across your whole library (PREMIUM).
 *
 * The session shows one card at a time: tap to reveal the answer, then
 * mark "Got it" or "Review again". At the end you get a quick summary.
 */

import React, { useMemo, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useConcepts } from '../src/ConceptsContext';
import { usePremium } from '../src/premium';
import { colors, spacing, fontSize, radius } from '../src/theme';
import { Flashcard } from '../src/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

/** A flashcard plus which concept it came from (for the mixed quiz). */
type ReviewCard = Flashcard & { source?: string };

/** Fisher–Yates shuffle (returns a new array). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ReviewScreen({ route, navigation }: Props) {
  const conceptId = route.params?.conceptId;
  const isLibraryQuiz = !conceptId;

  const { getConcept, concepts } = useConcepts();
  const { isPremium, unlock } = usePremium();

  // Build the deck of cards for this session.
  const cards = useMemo<ReviewCard[]>(() => {
    if (conceptId) {
      const c = getConcept(conceptId);
      return c?.flashcards ?? [];
    }
    // Library quiz: gather every concept's cards, tagged and shuffled.
    const all: ReviewCard[] = [];
    concepts.forEach((c) => {
      (c.flashcards ?? []).forEach((f) => all.push({ ...f, source: c.title }));
    });
    return shuffle(all);
  }, [conceptId, concepts, getConcept]);

  const conceptTitle = conceptId ? getConcept(conceptId)?.title : undefined;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isLibraryQuiz ? 'Library Quiz' : `Review: ${conceptTitle ?? ''}`,
    });
  }, [navigation, isLibraryQuiz, conceptTitle]);

  // Premium gate for the library-wide quiz.
  if (isLibraryQuiz && !isPremium) {
    return <LockedQuiz onUnlock={unlock} />;
  }

  if (cards.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>🎴</Text>
        <Text style={styles.emptyText}>
          {isLibraryQuiz
            ? 'Add some concepts from the library first — then you can quiz across all of them.'
            : 'This concept has no flashcards yet.'}
        </Text>
      </View>
    );
  }

  return <Session cards={cards} onDone={() => navigation.goBack()} />;
}

/** The actual review loop over a deck of cards. */
function Session({
  cards,
  onDone,
}: {
  cards: ReviewCard[];
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [gotIt, setGotIt] = useState(0);
  const [finished, setFinished] = useState(false);

  const card = cards[index];
  const progress = (index + (revealed ? 1 : 0)) / cards.length;

  function answer(known: boolean) {
    if (known) setGotIt((n) => n + 1);
    if (index + 1 >= cards.length) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setRevealed(false);
    }
  }

  function restart() {
    setIndex(0);
    setRevealed(false);
    setGotIt(0);
    setFinished(false);
  }

  if (finished) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>🎉</Text>
        <Text style={styles.summaryTitle}>Session complete</Text>
        <Text style={styles.summaryText}>
          You reviewed {cards.length} card{cards.length === 1 ? '' : 's'}.
        </Text>
        <Text style={styles.summaryScore}>
          Got it: {gotIt} · To review: {cards.length - gotIt}
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={restart}>
          <Text style={styles.primaryBtnText}>Review again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onDone}>
          <Text style={styles.secondaryBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.sessionContent}>
      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {index + 1} / {cards.length}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Card */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => setRevealed(true)}
      >
        {card.source && <Text style={styles.cardSource}>{card.source}</Text>}
        <Text style={styles.cardFront}>{card.front}</Text>

        {revealed ? (
          <>
            <View style={styles.cardDivider} />
            <Text style={styles.cardBack}>{card.back}</Text>
          </>
        ) : (
          <Text style={styles.tapHint}>Tap to reveal the answer</Text>
        )}
      </TouchableOpacity>

      {/* Actions */}
      {revealed ? (
        <View style={styles.answerRow}>
          <TouchableOpacity
            style={[styles.answerBtn, styles.reviewAgain]}
            onPress={() => answer(false)}
          >
            <Text style={styles.reviewAgainText}>Review again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.answerBtn, styles.gotItBtn]}
            onPress={() => answer(true)}
          >
            <Text style={styles.gotItText}>Got it</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setRevealed(true)}>
          <Text style={styles.primaryBtnText}>Show answer</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

/** Shown when a free user opens the library-wide (premium) quiz. */
function LockedQuiz({ onUnlock }: { onUnlock: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyEmoji}>🔒</Text>
      <Text style={styles.summaryTitle}>Library Quiz is Premium</Text>
      <Text style={styles.lockedBody}>
        Quiz yourself across every concept in your library — mixed, shuffled,
        and scored. A powerful way to actually remember what you learn.
      </Text>
      <Text style={styles.lockedBody}>
        (You can still review each concept's flashcards for free from its own
        page.)
      </Text>
      <TouchableOpacity style={styles.unlockBtn} activeOpacity={0.85} onPress={onUnlock}>
        <Text style={styles.unlockBtnText}>Unlock Premium</Text>
      </TouchableOpacity>
      <Text style={styles.lockedNote}>
        Demo build — no charge. In the finished app this opens the store
        purchase.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  sessionContent: { padding: spacing.lg, gap: spacing.lg },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Progress
  progressRow: { gap: spacing.sm },
  progressText: { fontSize: fontSize.sm, color: colors.textMuted },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: colors.primary },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 220,
    justifyContent: 'center',
  },
  cardSource: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  cardFront: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 30,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  cardBack: { fontSize: fontSize.lg, color: colors.text, lineHeight: 26 },
  tapHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.lg,
    fontStyle: 'italic',
  },

  // Answer buttons
  answerRow: { flexDirection: 'row', gap: spacing.md },
  answerBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  reviewAgain: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  reviewAgainText: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  gotItBtn: { backgroundColor: colors.primary },
  gotItText: { color: colors.textOnPrimary, fontSize: fontSize.md, fontWeight: '600' },

  // Generic buttons
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.textOnPrimary, fontSize: fontSize.lg, fontWeight: '600' },
  secondaryBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  secondaryBtnText: { color: colors.textMuted, fontSize: fontSize.md },

  // Summary
  summaryTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  summaryText: { fontSize: fontSize.md, color: colors.textMuted },
  summaryScore: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '600',
    marginVertical: spacing.md,
  },

  // Locked
  lockedBody: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  unlockBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  unlockBtnText: { color: '#3A2E00', fontSize: fontSize.lg, fontWeight: '700' },
  lockedNote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
