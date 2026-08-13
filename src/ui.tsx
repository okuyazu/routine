/**
 * ui.tsx
 * -------------------------------------------------------------
 * Small reusable building blocks shared across screens, so the
 * logging screens (Labs, Exercise, Diet, Sleep) stay short and
 * consistent. Nothing app-specific lives here — just styled inputs,
 * buttons, cards, and choice "chips".
 */

import React, { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors, fontSize, radius, spacing } from './theme';

/** A titled white card container. */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** A section label (small, muted, uppercase-ish). */
export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** A labelled numeric text field. */
export function NumberField({
  label,
  value,
  onChangeText,
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Label>{label}</Label>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          inputMode="decimal"
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

/** A labelled free-text field. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Label>{label}</Label>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </View>
  );
}

/** A row of selectable "chips" — used for intensity, ratings, marker choice. */
export function ChipGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  renderLabel,
}: {
  label?: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (v: T) => string;
}) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Label>{label}</Label> : null}
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const selected = opt === value;
          return (
            <TouchableOpacity
              key={String(opt)}
              activeOpacity={0.8}
              onPress={() => onChange(opt)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {renderLabel ? renderLabel(opt) : String(opt)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/** A primary filled button. */
export function Button({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

/** A keyboard-aware scrolling page wrapper used by the logging screens. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  fieldWrap: { gap: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  suffix: { color: colors.textMuted, fontSize: fontSize.md, marginLeft: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  chipTextSelected: { color: colors.textOnPrimary },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.textOnPrimary, fontSize: fontSize.md, fontWeight: '700' },
});
