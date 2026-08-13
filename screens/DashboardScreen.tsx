/**
 * DashboardScreen.tsx
 * -------------------------------------------------------------
 * The first screen you see. It pulls together all four pillars into:
 *   • an overall Health Score,
 *   • an estimated life expectancy, and
 *   • a card per pillar (tap to log/review that pillar).
 * A short disclaimer keeps expectations honest.
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigation';
import { useHealth } from '../src/HealthContext';
import { PillarResult } from '../src/health';
import { colors, fontSize, radius, scoreColor, spacing } from '../src/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const ROUTE: Record<string, keyof RootStackParamList> = {
  labs: 'Labs',
  exercise: 'Exercise',
  diet: 'Diet',
  sleep: 'Sleep',
};

export default function DashboardScreen({ navigation }: Props) {
  const { summary, data } = useHealth();
  const { overallScore, estimatedLifeExpectancy, totalDelta, pillarsWithData } = summary;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brand}>Vita</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.profileLink}>
              {data.profile.age ? `${data.profile.age}y · ` : ''}Profile ›
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.tagline}>Your labs, movement, food & sleep — in one score.</Text>

        {/* Hero: overall score + life expectancy */}
        <View style={styles.hero}>
          <ScoreDial score={overallScore} />
          <View style={styles.lifeBox}>
            <Text style={styles.lifeLabel}>Estimated life expectancy</Text>
            <Text style={styles.lifeValue}>
              {pillarsWithData > 0 ? `${estimatedLifeExpectancy}` : '—'}
              <Text style={styles.lifeUnit}> yrs</Text>
            </Text>
            {pillarsWithData > 0 && (
              <Text
                style={[
                  styles.lifeDelta,
                  { color: totalDelta >= 0 ? colors.good : colors.bad },
                ]}
              >
                {totalDelta >= 0 ? '▲' : '▼'} {Math.abs(totalDelta)} yrs vs. baseline{' '}
                {summary.baselineLifeExpectancy}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.insightsBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Insights')}
        >
          <Text style={styles.insightsBtnText}>💡 See insights & how this is estimated</Text>
        </TouchableOpacity>

        {/* Pillar cards */}
        <Text style={styles.sectionTitle}>Your four pillars</Text>
        {summary.pillars.map((p) => (
          <PillarCard
            key={p.key}
            pillar={p}
            onPress={() => navigation.navigate(ROUTE[p.key])}
          />
        ))}

        <Text style={styles.disclaimer}>
          Vita is an educational tool, not medical advice. The estimate is a transparent
          rule-of-thumb based on public-health guidance — it can't predict any individual's
          real lifespan. Talk to a clinician about your health.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Big circular-feeling score badge with a colored ring segment. */
function ScoreDial({ score }: { score: number | null }) {
  const color = score == null ? colors.textMuted : scoreColor(score);
  return (
    <View style={[styles.dial, { borderColor: color }]}>
      <Text style={[styles.dialScore, { color }]}>{score == null ? '—' : score}</Text>
      <Text style={styles.dialLabel}>Health Score</Text>
    </View>
  );
}

function PillarCard({
  pillar,
  onPress,
}: {
  pillar: PillarResult;
  onPress: () => void;
}) {
  const hasData = pillar.score != null;
  const color = hasData ? scoreColor(pillar.score as number) : colors.textMuted;
  return (
    <TouchableOpacity style={styles.pillar} activeOpacity={0.85} onPress={onPress}>
      <Text style={styles.pillarEmoji}>{pillar.emoji}</Text>
      <View style={{ flex: 1 }}>
        <View style={styles.pillarTopRow}>
          <Text style={styles.pillarTitle}>{pillar.label}</Text>
          <Text style={[styles.pillarScore, { color }]}>
            {hasData ? pillar.score : '—'}
          </Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${hasData ? (pillar.score as number) : 0}%`, backgroundColor: color },
            ]}
          />
        </View>
        <Text style={styles.pillarSummary}>{pillar.summary}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  brand: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.primary },
  profileLink: { fontSize: fontSize.md, color: colors.textMuted, fontWeight: '600' },
  tagline: { fontSize: fontSize.md, color: colors.textMuted, marginTop: -spacing.sm },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  dial: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dialScore: { fontSize: fontSize.huge, fontWeight: '800', lineHeight: 48 },
  dialLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
  lifeBox: { flex: 1, gap: 2 },
  lifeLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  lifeValue: { fontSize: fontSize.huge, fontWeight: '800', color: colors.text },
  lifeUnit: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textMuted },
  lifeDelta: { fontSize: fontSize.sm, fontWeight: '700' },
  insightsBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  insightsBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: fontSize.md },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  pillar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pillarEmoji: { fontSize: 30 },
  pillarTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillarTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  pillarScore: { fontSize: fontSize.lg, fontWeight: '800' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  pillarSummary: { fontSize: fontSize.sm, color: colors.textMuted },
  chevron: { fontSize: 26, color: colors.textMuted },
  disclaimer: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
});
