/**
 * ReflectScreen.tsx
 * -------------------------------------------------------------
 * The "Socratic companion" — a guided reflection on one concept.
 * Shows thought-provoking questions one at a time with a text box to
 * write your answer. Answers autosave to your journal, so you can come
 * back and see (or continue) what you wrote. No right or wrong answers.
 */

import React, { useMemo, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useConcepts } from '../src/ConceptsContext';
import { useJournal } from '../src/journal';
import { reflectionFor } from '../src/reflect';
import { colors, spacing, fontSize, radius } from '../src/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Reflect'>;

/** The Socratic "move" each question represents (for a small label). */
const MOVE_LABELS = ['Clarify', 'Apply', 'Challenge', 'Perspective', 'Consequence', 'Connect'];

export default function ReflectScreen({ route, navigation }: Props) {
  const { conceptId } = route.params;
  const { getConcept } = useConcepts();
  const { getAnswer, setAnswer, answeredCount } = useJournal();

  const concept = getConcept(conceptId);
  const title = concept?.title ?? '';
  const questions = useMemo(() => (title ? reflectionFor(title) : []), [title]);

  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: title ? `Reflect: ${title}` : 'Reflect' });
  }, [navigation, title]);

  if (!concept || questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Nothing to reflect on here.</Text>
      </View>
    );
  }

  // --- Summary at the end ---
  if (finished) {
    const answered = answeredCount(title, questions);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.summaryEmoji}>🧠</Text>
        <Text style={styles.summaryTitle}>Reflection saved</Text>
        <Text style={styles.summarySub}>
          You responded to {answered} of {questions.length} questions on {title}.
          Come back anytime — your notes are here.
        </Text>

        {questions.map((q, i) => {
          const a = getAnswer(title, q).trim();
          return (
            <View key={i} style={styles.reviewItem}>
              <Text style={styles.reviewQ}>{q}</Text>
              <Text style={a ? styles.reviewA : styles.reviewEmpty}>
                {a || '— (not answered)'}
              </Text>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            setIndex(0);
            setFinished(false);
          }}
        >
          <Text style={styles.primaryBtnText}>Review again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryBtnText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // --- One question at a time ---
  const question = questions[index];
  const isLast = index === questions.length - 1;
  const moveLabel = MOVE_LABELS[index] ?? 'Reflect';
  const progress = (index + 1) / questions.length;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {moveLabel} · {index + 1} / {questions.length}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        {/* Question */}
        <Text style={styles.question}>{question}</Text>

        {/* Answer box */}
        <TextInput
          style={styles.input}
          value={getAnswer(title, question)}
          onChangeText={(t) => setAnswer(title, question, t)}
          placeholder="Write your thoughts… (saved automatically)"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.hint}>
          There are no right answers — this is just for you.
        </Text>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, index === 0 && styles.navBtnDisabled]}
          disabled={index === 0}
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <Text style={styles.navBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, styles.navBtnPrimary]}
          onPress={() => (isLast ? setFinished(true) : setIndex((i) => i + 1))}
        >
          <Text style={styles.navBtnPrimaryText}>{isLast ? 'Finish' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  muted: { fontSize: fontSize.md, color: colors.textMuted },

  progressRow: { gap: spacing.sm },
  progressText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '700' },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: colors.primary },

  question: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 30,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 140,
    lineHeight: 22,
  },
  hint: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },

  navRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  navBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  navBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  navBtnPrimaryText: { color: colors.textOnPrimary, fontSize: fontSize.md, fontWeight: '700' },

  // Summary
  summaryEmoji: { fontSize: 44, textAlign: 'center' },
  summaryTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  summarySub: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  reviewItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  reviewQ: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  reviewA: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  reviewEmpty: { fontSize: fontSize.md, color: colors.textMuted, fontStyle: 'italic' },

  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryBtnText: { color: colors.textOnPrimary, fontSize: fontSize.lg, fontWeight: '600' },
  secondaryBtn: { paddingVertical: spacing.md, alignItems: 'center' },
  secondaryBtnText: { color: colors.textMuted, fontSize: fontSize.md },
});
