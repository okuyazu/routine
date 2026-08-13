/**
 * ProfileScreen.tsx
 * -------------------------------------------------------------
 * Basic profile: age, sex, height, weight. Age + sex set the
 * baseline life expectancy the estimate builds on; height + weight
 * give us BMI (one of the lab-pillar markers). Edits save instantly.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useHealth } from '../src/HealthContext';
import { Card, ChipGroup, NumberField, Screen } from '../src/ui';
import { Sex } from '../src/types';
import { computeBMI } from '../src/health';
import { colors, fontSize, spacing } from '../src/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const SEXES: readonly Sex[] = ['male', 'female'];

/** Turn a text field into a number or null (empty = null). */
function toNum(t: string): number | null {
  if (t.trim() === '') return null;
  const n = parseFloat(t);
  return Number.isNaN(n) ? null : n;
}

export default function ProfileScreen(_props: Props) {
  const { data, updateProfile, summary } = useHealth();
  const { profile } = data;
  const bmi = computeBMI(profile);

  return (
    <Screen>
      <Card>
        <Text style={styles.cardTitle}>About you</Text>
        <ChipGroup
          label="Sex (for baseline life expectancy)"
          options={SEXES}
          value={profile.sex}
          onChange={(s) => updateProfile({ sex: s })}
          renderLabel={(s) => (s === 'male' ? 'Male' : 'Female')}
        />
        <NumberField
          label="Age"
          value={profile.age?.toString() ?? ''}
          onChangeText={(t) => updateProfile({ age: toNum(t) })}
          placeholder="35"
          suffix="yrs"
        />
        <NumberField
          label="Height"
          value={profile.heightCm?.toString() ?? ''}
          onChangeText={(t) => updateProfile({ heightCm: toNum(t) })}
          placeholder="175"
          suffix="cm"
        />
        <NumberField
          label="Weight"
          value={profile.weightKg?.toString() ?? ''}
          onChangeText={(t) => updateProfile({ weightKg: toNum(t) })}
          placeholder="70"
          suffix="kg"
        />
      </Card>

      <View style={styles.info}>
        <Text style={styles.infoLine}>
          Baseline life expectancy:{' '}
          <Text style={styles.infoStrong}>{summary.baselineLifeExpectancy} yrs</Text>
        </Text>
        <Text style={styles.infoLine}>
          BMI:{' '}
          <Text style={styles.infoStrong}>
            {bmi != null ? `${bmi} kg/m²` : 'set height & weight'}
          </Text>
        </Text>
      </View>

      <Text style={styles.note}>
        Everything you enter stays on this device. Nothing is uploaded.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  info: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  infoLine: { fontSize: fontSize.md, color: colors.textMuted },
  infoStrong: { color: colors.text, fontWeight: '700' },
  note: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },
});
