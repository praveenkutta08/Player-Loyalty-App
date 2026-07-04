import { ScanLine, Sparkles, Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useManifest } from '../../app/manifest/ManifestProvider';
import { navigationRef } from '../../app/navigation/navigationRef';
import { useFeature } from '../../app/providers/FeatureProvider';
import { CapsLabel, GlassCard, Kicker, Screen, StatusPill, ThemedText } from '../../components';
import { withAlpha } from '../../theme/color';
import { useTheme } from '../../theme/ThemeProvider';
import { useGetAccountMeQuery } from '../account/accountApi';
import { useTrackEventMutation } from '../analytics/analyticsApi';
import { ContextStrip, RecoHero } from '../concierge/components';
import { useGetBriefQuery } from '../concierge/conciergeApi';
import { PlanSheet } from '../concierge/PlanSheet';
import { useConciergePersona } from '../concierge/useConciergePersona';
import { OfferCard } from '../offers/OfferCard';
import { useGetOffersQuery, useGetPromotionsQuery } from '../offers/offersApi';

import type { MainTabParamList } from '../../app/navigation/types';
import type { OfferOut } from '../offers/offersApi';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;

/** Time-of-day greeting (local device clock) — "Good Morning / Afternoon / Evening". */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * H1 — Home, re-skinned to obsidian luxury (RS2). A full-bleed atmospheric hero with a Playfair
 * time-of-day greeting, an "AI RECOMMENDATIONS" section driven by the existing concierge brief
 * (rendered from cache — never a spinner; RG-safe copy + "some context unavailable" behavior
 * intact), a promotions rail, and a tier/points stat strip. Content, concierge behavior, and the
 * tab bar structure (Option B) are unchanged — visual layer only.
 */
export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const c = theme.colors;
  const { manifest } = useManifest();
  const me = useGetAccountMeQuery();
  const promotions = useGetPromotionsQuery();
  const offers = useGetOffersQuery();
  const cashless = useFeature('cardless');
  const conciergeOn = useFeature('concierge');
  const { name: personaName } = useConciergePersona();
  const brief = useGetBriefQuery(undefined, { skip: !conciergeOn });
  const [planOpen, setPlanOpen] = useState(false);
  const [trackEvent] = useTrackEventMutation();
  const mountedAt = React.useRef(Date.now());
  const renderTracked = React.useRef(false);

  const greetingName = me.data?.email?.split('@')[0] ?? 'there';
  const featured = offers.data?.[0];
  const showConciergeHero = conciergeOn && brief.data != null;

  // brief_render_ms: perceived time-to-first-answer (target <1.5s; prefetch makes it ~0).
  React.useEffect(() => {
    if (showConciergeHero && !renderTracked.current) {
      renderTracked.current = true;
      void trackEvent({ type: 'brief_render_ms', meta: { ms: Date.now() - mountedAt.current } });
    }
  }, [showConciergeHero, trackEvent]);

  const openPromotion = (promotion: OfferOut): void =>
    navigation.navigate('Offers', { screen: 'PromotionDetail', params: { promotion } });
  const openOffer = (offer: OfferOut): void =>
    navigation.navigate('Offers', { screen: 'OfferDetail', params: { offer } });
  const onHeroCta = (action: string): void => {
    if (action === 'concierge.plan') {
      void trackEvent({ type: 'answer_accepted', meta: { fit_score: brief.data?.fit_score } });
      setPlanOpen(true);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Atmospheric hero: Playfair greeting over a soft indigo glow. */}
        <View style={styles.hero}>
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id="homeVoid" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.bg.surface} />
                <Stop offset="1" stopColor={c.bg.base} />
              </LinearGradient>
              <RadialGradient id="homeGlow" cx="78%" cy="18%" r="70%">
                <Stop offset="0" stopColor={withAlpha(c.brand.accent, 0.22)} />
                <Stop offset="1" stopColor={withAlpha(c.brand.accent, 0)} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#homeVoid)" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#homeGlow)" />
          </Svg>

          <View style={styles.topRow}>
            <Kicker color="secondary">{manifest?.name ?? 'Executive Companion'}</Kicker>
            <View style={[styles.pointsPill, { borderColor: c.border.ghost ?? c.border.strong }]}>
              <ThemedText variant="mono" style={{ color: c.brand.accent }}>
                {me.data?.points ?? 0} pts
              </ThemedText>
            </View>
          </View>

          <View style={styles.heroTitle}>
            <ThemedText variant="display">{greeting()},</ThemedText>
            <ThemedText variant="display" color="secondary" style={styles.heroName}>
              {greetingName}
            </ThemedText>
          </View>
        </View>

        <View style={styles.body}>
          {/* AI recommendations — the concierge brief, advisory only (RG-safe copy preserved). */}
          {showConciergeHero && brief.data ? (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <CapsLabel>AI Recommendations</CapsLabel>
                <Pressable onPress={() => navigationRef.navigate('AskAI')} hitSlop={8}>
                  <CapsLabel color="faint">View All</CapsLabel>
                </Pressable>
              </View>
              <RecoHero envelope={brief.data} onCta={onHeroCta} />
              <View style={styles.contextStrip}>
                <ContextStrip signals={brief.data.signals} />
              </View>
              <Pressable
                accessibilityRole="button"
                testID="ask-entry"
                onPress={() => navigationRef.navigate('AskAI')}
                style={styles.askRow}
              >
                <Sparkles size={14} color={c.brand.accent} />
                <ThemedText variant="label" style={[styles.askLabel, { color: c.brand.accent }]}>
                  Ask {personaName} about your visit
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {/* Quick actions */}
          <View style={styles.actions}>
            <QuickAction
              icon={<ScanLine size={22} color={c.brand.accent} />}
              label={cashless ? 'Scan / Play' : 'Wallet'}
              onPress={() => navigation.navigate('Play')}
            />
            <QuickAction
              icon={<Wallet size={22} color={c.brand.accent} />}
              label="Wallet"
              onPress={() => navigation.navigate('Play')}
            />
          </View>

          {/* Promotions rail */}
          {promotions.data && promotions.data.length > 0 ? (
            <View style={styles.section}>
              <CapsLabel style={styles.sectionTitle}>Promotions</CapsLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {promotions.data.map((p) => (
                  <View key={p.id} style={styles.carouselItem}>
                    <OfferCard offer={p} onPress={() => openPromotion(p)} />
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Featured offer — static fallback when concierge is off / brief not yet cached. */}
          {!showConciergeHero && featured ? (
            <View style={styles.section}>
              <CapsLabel style={styles.sectionTitle} testID="featured-offer">
                Featured Offer
              </CapsLabel>
              <OfferCard offer={featured} onPress={() => openOffer(featured)} />
            </View>
          ) : null}

          {/* Tier / points stat strip */}
          <GlassCard style={styles.statStrip}>
            <View style={styles.statCol}>
              <CapsLabel color="muted">Current Tier</CapsLabel>
              <ThemedText variant="h2" style={styles.statValue}>
                {me.data?.tier ?? '—'}
              </ThemedText>
              {me.data?.segment ? <StatusPill label={me.data.segment} tone="purple" /> : null}
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: c.border.ghost ?? c.border.soft }]}
            />
            <View style={styles.statCol}>
              <CapsLabel color="muted">Points Balance</CapsLabel>
              <ThemedText variant="h2" style={{ color: c.brand.accent }}>
                {me.data?.points ?? 0}
              </ThemedText>
            </View>
          </GlassCard>
        </View>
      </ScrollView>
      <PlanSheet visible={planOpen} onClose={() => setPlanOpen(false)} />
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <Pressable onPress={onPress} style={styles.action} accessibilityRole="button">
      <View
        style={[
          styles.actionIcon,
          {
            backgroundColor: withAlpha(c.brand.accent, 0.12),
            borderColor: c.border.ghost ?? c.border.strong,
          },
        ]}
      >
        {icon}
      </View>
      <ThemedText variant="label" color="secondary" style={{ marginTop: 8 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  hero: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pointsPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  heroTitle: { marginTop: 40 },
  heroName: { fontStyle: 'italic' },
  body: { paddingHorizontal: 24 },
  section: { marginTop: 32 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  contextStrip: { marginTop: 10 },
  askRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  askLabel: { marginLeft: 6 },
  actions: { flexDirection: 'row', marginTop: 32 },
  action: { alignItems: 'center', marginRight: 28 },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { marginBottom: 12 },
  carouselItem: { width: 260, marginRight: 12 },
  statStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 32 },
  statCol: { flex: 1, alignItems: 'flex-start', gap: 6 },
  statValue: { textTransform: 'capitalize' },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: 16 },
});
