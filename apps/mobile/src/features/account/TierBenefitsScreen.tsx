import { Check, Lock } from 'lucide-react-native';
import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { useManifest } from '../../app/manifest/ManifestProvider';
import { Card, ProgressBar, Screen, StatusPill, ThemedText } from '../../components';
import { resolveAssetUri } from '../../lib/assetUri';
import { useTheme } from '../../theme/ThemeProvider';

import { useGetAccountMeQuery } from './accountApi';
import { TIER_LADDER, tierProgress } from './tiers';

/** C3 — Tier & benefits: progress to the next tier and the full benefit ladder (current + upcoming). */
export function TierBenefitsScreen(): React.JSX.Element {
  const theme = useTheme();
  const { manifest } = useManifest();
  const me = useGetAccountMeQuery();

  const points = me.data?.points ?? 0;
  const progress = tierProgress(points, me.data?.tier ?? 'bronze');
  const currentIdx = TIER_LADDER.findIndex((t) => t.key === progress.current.key);
  const cardArt = resolveAssetUri(manifest?.tierCards?.[progress.current.key]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {cardArt ? (
          <Image
            source={{ uri: cardArt }}
            style={[styles.hero, { borderRadius: theme.radius.wallet ?? 12 }]}
            resizeMode="cover"
          />
        ) : null}
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <ThemedText variant="h2">{progress.current.label}</ThemedText>
            <ThemedText variant="title" style={{ color: theme.colors.brand.gold }}>
              {points.toLocaleString()} pts
            </ThemedText>
          </View>
          <View style={styles.progress}>
            <ProgressBar ratio={progress.ratio} />
          </View>
          <ThemedText variant="body" color="muted">
            {progress.next
              ? `${progress.pointsToNext.toLocaleString()} pts to reach ${progress.next.label}`
              : 'You have reached the highest tier — enjoy every benefit.'}
          </ThemedText>
        </Card>

        {TIER_LADDER.map((tier, idx) => {
          const unlocked = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <Card
              key={tier.key}
              style={[
                styles.card,
                isCurrent && { borderColor: theme.colors.brand.gold, borderWidth: 1 },
              ]}
            >
              <View style={styles.rowBetween}>
                <ThemedText variant="title">{tier.label}</ThemedText>
                {isCurrent ? (
                  <StatusPill label="Current" tone="warning" />
                ) : (
                  <ThemedText variant="label" color="muted">
                    {tier.threshold.toLocaleString()} pts
                  </ThemedText>
                )}
              </View>
              <View style={styles.benefits}>
                {tier.benefits.map((benefit) => (
                  <View key={benefit} style={styles.benefitRow}>
                    {unlocked ? (
                      <Check size={16} color={theme.colors.state.success} />
                    ) : (
                      <Lock size={14} color={theme.colors.text.faint} />
                    )}
                    <ThemedText
                      variant="body"
                      color={unlocked ? 'secondary' : 'muted'}
                      style={styles.benefitText}
                    >
                      {benefit}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  hero: { width: '100%', aspectRatio: 1.6, marginBottom: 16 },
  card: { marginBottom: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progress: { marginVertical: 12 },
  benefits: { marginTop: 12, gap: 8 },
  benefitRow: { flexDirection: 'row', alignItems: 'center' },
  benefitText: { marginLeft: 10 },
});
