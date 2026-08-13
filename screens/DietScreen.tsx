/**
 * DietScreen.tsx
 * -------------------------------------------------------------
 * A quick daily diet snapshot: overall quality, servings of fruit &
 * veg, sugary drinks, and alcohol units. Kept coarse on purpose so
 * it takes ten seconds to log.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useHealth, today } from '../src/HealthContext';
import { Button, Card, ChipGroup, NumberField, Screen } from '../src/ui';
import { colors, fontSize, spacing } from '../src/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Diet'>;

const RATINGS = [1, 2, 3, 4, 5] as const;

export default function DietScreen(_props: Props) {
  const { data, summary, addDiet, removeEntry } = useHealth();
  const [quality, setQuality] = useState<number>(3);
  const [fruitVeg, setFruitVeg] = useState('');
  const [sugaryDrinks, setSugaryDrinks] = useState('');
  const [alcoholUnits, setAlcoholUnits] = useState('');

  const pillar = summary.pillars.find((p) => p.key === 'diet');

  function submit() {
    addDiet({
      date: today(),
      quality,
      fruitVeg: parseFloat(fruitVeg) || 0,
      sugaryDrinks: parseFloat(sugaryDrinks) || 0,
      alcoholUnits: parseFloat(alcoholUnits) || 0,
    });
    setFruitVeg('');
    setSugaryDrinks('');
    setAlcoholUnits('');
    setQuality(3);
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.cardTitle}>Log today's eating</Text>
        <ChipGroup
          label="Overall quality (1 poor – 5 excellent)"
          options={RATINGS}
          value={quality}
          onChange={setQuality}
        />
        <NumberField
          label="Fruit & veg servings"
          value={fruitVeg}
          onChangeText={setFruitVeg}
          placeholder="5"
          suffix="servings"
        />
        <NumberField
          label="Sugary drinks"
          value={sugaryDrinks}
          onChangeText={setSugaryDrinks}
          placeholder="0"
        />
        <NumberField
          label="Alcohol units"
          value={alcoholUnits}
          onChangeText={setAlcoholUnits}
          placeholder="0"
        />
        <Button title="Add day" onPress={submit} />
      </Card>

      {pillar && <Text style={styles.summary}>{pillar.emoji} {pillar.summary}</Text>}

      <Text style={styles.sectionTitle}>Recent days</Text>
      {data.diet.length === 0 ? (
        <Text style={styles.empty}>No days logged yet.</Text>
      ) : (
        data.diet.map((e) => (
          <View key={e.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Quality {e.quality}/5</Text>
              <Text style={styles.rowMeta}>
                {e.date} · {e.fruitVeg} fruit/veg · {e.sugaryDrinks} sugary · {e.alcoholUnits}{' '}
                alcohol
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeEntry('diet', e.id)}>
              <Text style={styles.delete}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  summary: { fontSize: fontSize.md, color: colors.textMuted, lineHeight: 22 },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  empty: { color: colors.textMuted, fontSize: fontSize.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  delete: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '700' },
});
