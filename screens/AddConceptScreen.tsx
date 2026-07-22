/**
 * AddConceptScreen.tsx
 * -------------------------------------------------------------
 * Where the user types a concept to add. On submit we:
 *   1. create the concept (which starts AI generation), and
 *   2. jump straight to its detail screen to watch it generate.
 * A few suggestion chips make it easy to try the app.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useConcepts } from '../src/ConceptsContext';
import { colors, spacing, fontSize, radius } from '../src/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddConcept'>;

const SUGGESTIONS = [
  'Stoicism',
  'Existentialism',
  'Absurdism',
  'Epicureanism',
  'The meaning of life',
  'Free will',
];

export default function AddConceptScreen({ navigation }: Props) {
  const { addConcept } = useConcepts();
  const [text, setText] = useState('');

  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0;

  async function handleAdd(value: string) {
    const title = value.trim();
    if (!title) return;
    const id = await addConcept(title);
    // Replace this screen with the detail screen so the back button
    // returns to Home, not to a blank Add screen.
    navigation.replace('ConceptDetail', { id });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>What do you want to learn?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Stoicism, Kant's categorical imperative…"
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            autoFocus
            returnKeyType="go"
            onSubmitEditing={() => handleAdd(text)}
          />

          <Text style={styles.suggestLabel}>Or try one of these</Text>
          <View style={styles.chips}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.chip}
                activeOpacity={0.8}
                onPress={() => handleAdd(s)}
              >
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          activeOpacity={0.85}
          disabled={!canSubmit}
          onPress={() => handleAdd(text)}
        >
          <Text style={styles.buttonText}>Generate lesson</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  suggestLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.text, fontSize: fontSize.md },
  button: {
    backgroundColor: colors.primary,
    margin: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: colors.textMuted, opacity: 0.5 },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
