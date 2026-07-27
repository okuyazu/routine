/**
 * LibraryScreen.tsx
 * -------------------------------------------------------------
 * Browse the built-in catalog of concepts, grouped by tradition.
 * Tapping a concept adds it to your library (instantly, no AI needed)
 * and opens its detail screen. Concepts you already have are marked.
 */

import React from 'react';
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
import { LIBRARY, TRADITIONS, LibraryConcept } from '../src/library';
import { colors, spacing, fontSize, radius } from '../src/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Library'>;

export default function LibraryScreen({ navigation }: Props) {
  const { concepts, addFromLibrary } = useConcepts();

  // Titles the user already has, lower-cased, for the "added" check.
  const ownedTitles = new Set(concepts.map((c) => c.title.toLowerCase()));

  function open(item: LibraryConcept) {
    const id = addFromLibrary(item); // adds if new, or finds the existing one
    navigation.navigate('ConceptDetail', { id });
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.intro}>
        A curated catalog — tap any concept to add it to your library and start
        learning. No AI required.
      </Text>

      {TRADITIONS.map((tradition) => {
        const items = LIBRARY.filter((c) => c.tradition === tradition);
        if (items.length === 0) return null;
        return (
          <View key={tradition} style={styles.group}>
            <Text style={styles.groupTitle}>{tradition}</Text>
            {items.map((item) => {
              const owned = ownedTitles.has(item.title.toLowerCase());
              return (
                <TouchableOpacity
                  key={item.title}
                  style={styles.card}
                  activeOpacity={0.8}
                  onPress={() => open(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSummary}>{item.content.summary}</Text>
                  </View>
                  <Text style={owned ? styles.owned : styles.add}>
                    {owned ? '✓ Added' : '+ Add'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  intro: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  group: { marginBottom: spacing.lg },
  groupTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  cardSummary: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  add: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  owned: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accent },
});
