/**
 * InsightsScreen.tsx
 * -------------------------------------------------------------
 * Two jobs:
 *   1. Personalized: the biggest wins you can act on right now, and
 *      each pillar's contribution to the life-expectancy estimate.
 *   2. Transparent: plainly explain HOW the estimate is built, so
 *      it never feels like a black box.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useHealth } from '../src/HealthContext';
import { Card, Screen } from '../src/ui';
import { topTips } from '../src/health';
import { colors, fontSize, spacing } from '../src/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Insights'>;

export default function InsightsScreen(_props: Props) {
  const { summary } = useHealth();
  const tips = topTips(summary, 5);

  return (
    <Screen>
      {/* Top wins */}
      <Card>
        <Text style={styles.cardTitle}>Your top wins</Text>
        {summary.pillarsWithData === 0 ? (
          <Text style={styles.body}>
            Start logging in any pillar and personalized suggestions will appear here.
          </Text>
        ) : (
          tips.map((t, i) => (
            <Text key={i} style={styles.tip}>
              • {t}
            </Text>
          ))
        )}
      </Card>

      {/* Pillar contributions */}
      <Card>
        <Text style={styles.cardTitle}>How each pillar moves your estimate</Text>
        {summary.pillars.map((p) => (
          <View key={p.key} style={styles.contribRow}>
            <Text style={styles.contribLabel}>
              {p.emoji} {p.label}
            </Text>
            <Text
              style={[
                styles.contribValue,
                {
                  color:
                    p.score == null
                      ? colors.textMuted
                      : p.lifespanDelta >= 0
                      ? colors.good
                      : colors.bad,
                },
              ]}
            >
              {p.score == null
                ? 'no data'
                : `${p.lifespanDelta >= 0 ? '+' : ''}${p.lifespanDelta} yrs`}
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Net adjustment</Text>
          <Text style={styles.totalValue}>
            {summary.totalDelta >= 0 ? '+' : ''}
            {summary.totalDelta} yrs
          </Text>
        </View>
        <Text style={styles.formula}>
          Estimate = baseline {summary.baselineLifeExpectancy} {summary.totalDelta >= 0 ? '+' : '−'}{' '}
          {Math.abs(summary.totalDelta)} = {summary.estimatedLifeExpectancy} yrs
        </Text>
      </Card>

      {/* Methodology */}
      <Card>
        <Text style={styles.cardTitle}>How the estimate works</Text>
        <Text style={styles.body}>
          Vita scores four pillars from your recent logs, then combines them:
        </Text>
        <Text style={styles.bullet}>
          🩸 <Text style={styles.b}>Labs (35%)</Text> — each marker (blood pressure,
          cholesterol, glucose, HbA1c, resting HR, BMI) is compared to its standard optimal
          range.
        </Text>
        <Text style={styles.bullet}>
          🏃 <Text style={styles.b}>Exercise (25%)</Text> — your last 7 days vs. the WHO
          target of 150 moderate-equivalent minutes (vigorous counts double).
        </Text>
        <Text style={styles.bullet}>
          🥗 <Text style={styles.b}>Diet (20%)</Text> — daily quality, fruit & veg, minus
          sugary drinks and excess alcohol.
        </Text>
        <Text style={styles.bullet}>
          😴 <Text style={styles.b}>Sleep (20%)</Text> — favouring a consistent 7–8 hours
          with good quality.
        </Text>
        <Text style={styles.body}>
          Each pillar's score nudges a baseline life expectancy ({summary.baselineLifeExpectancy}{' '}
          years, set by sex) up or down. The total is capped within ±12 years so no single
          habit swings it unrealistically.
        </Text>
      </Card>

      <Text style={styles.disclaimer}>
        This is a transparent educational model, not a medical device or an actuarial
        prediction. Real longevity depends on genetics, environment, medical history, and
        chance far beyond what any app can measure. Use Vita to spot habits worth improving —
        and see a clinician for anything that concerns you.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  body: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  tip: { fontSize: fontSize.md, color: colors.text, lineHeight: 24 },
  bullet: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  b: { fontWeight: '700' },
  contribRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  contribLabel: { fontSize: fontSize.md, color: colors.text },
  contribValue: { fontSize: fontSize.md, fontWeight: '700' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  totalValue: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
  formula: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  disclaimer: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
});
