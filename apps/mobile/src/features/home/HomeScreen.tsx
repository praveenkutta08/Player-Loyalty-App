import { ScanLine, Sparkles, Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useManifest } from '../../app/manifest/ManifestProvider';
import { navigationRef } from '../../app/navigation/navigationRef';
import { useFeature } from '../../app/providers/FeatureProvider';
import { Card, Screen, StatusPill, ThemedText } from '../../components';
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

/**
 * H1 — Home: brandable hero + tier/points, promotions carousel, quick actions. With the
 * `concierge` flag on, the recommendations slot becomes the concierge hero (prefetched during
 * splash — rendered from cache, never a spinner); flag off (or brief not yet cached) falls back
 * to the static featured offer, so there are no dead ends either way.
 */
export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
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
      void trackEvent({
        type: 'brief_render_ms',
        meta: { ms: Date.now() - mountedAt.current },
      });
    }
  }, [showConciergeHero, trackEvent]);

  const openPromotion = (promotion: OfferOut): void =>
    navigation.navigate('Offers', { screen: 'PromotionDetail', params: { promotion } });
  const openOffer = (offer: OfferOut): void =>
    navigation.navigate('Offers', { screen: 'OfferDetail', params: { offer } });
  const onHeroCta = (action: string): void => {
    if (action === 'concierge.plan') {
      // answer_accepted: the headline concierge metric (mentor notes §9).
      void trackEvent({ type: 'answer_accepted', meta: { fit_score: brief.data?.fit_score } });
      setPlanOpen(true);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero */}
        <ThemedText variant="kicker" color="muted">
          {manifest?.name ?? 'Welcome'}
        </ThemedText>
        <ThemedText variant="display" style={{ color: theme.colors.brand.gold }}>
          Hi {greetingName}
        </ThemedText>

        {/* Concierge hero (H1 recommendations slot) — pre-fetched brief, advisory only. */}
        {showConciergeHero && brief.data ? (
          <View style={styles.conciergeSlot}>
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
              <Sparkles size={14} color={theme.colors.text.muted} />
              <ThemedText variant="label" color="muted" style={styles.askLabel}>
                Ask {personaName} about your visit
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {/* Tier + points snapshot */}
        <Card style={styles.tierCard}>
          <View style={styles.tierRow}>
            <View>
              <ThemedText variant="label" color="muted">
                Tier
              </ThemedText>
              <ThemedText variant="h2" style={{ textTransform: 'capitalize' }}>
                {me.data?.tier ?? '—'}
              </ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText variant="label" color="muted">
                Points
              </ThemedText>
              <ThemedText variant="h2" style={{ color: theme.colors.brand.gold }}>
                {me.data?.points ?? 0}
              </ThemedText>
            </View>
          </View>
          {me.data?.segment ? (
            <View style={styles.segmentPill}>
              <StatusPill label={me.data.segment} tone="purple" />
            </View>
          ) : null}
        </Card>

        {/* Quick actions */}
        <View style={styles.actions}>
          <QuickAction
            icon={<ScanLine size={22} color={theme.colors.brand.onGold} />}
            label={cashless ? 'Scan / Play' : 'Wallet'}
            onPress={() => navigation.navigate('Play')}
          />
          <QuickAction
            icon={<Wallet size={22} color={theme.colors.brand.onGold} />}
            label="Wallet"
            onPress={() => navigation.navigate('Play')}
          />
        </View>

        {/* Promotions carousel */}
        {promotions.data && promotions.data.length > 0 ? (
          <>
            <ThemedText variant="title" style={styles.sectionTitle}>
              Promotions
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {promotions.data.map((p) => (
                <View key={p.id} style={styles.carouselItem}>
                  <OfferCard offer={p} onPress={() => openPromotion(p)} />
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* Featured offer — the static fallback recommendation when the concierge is off
            (or its brief hasn't landed yet). Never both surfaces at once. */}
        {!showConciergeHero && featured ? (
          <>
            <ThemedText variant="title" style={styles.sectionTitle} testID="featured-offer">
              Featured offer
            </ThemedText>
            <OfferCard offer={featured} onPress={() => openOffer(featured)} />
          </>
        ) : null}
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
  return (
    <Pressable onPress={onPress} style={styles.action} accessibilityRole="button">
      <View style={[styles.actionIcon, { backgroundColor: theme.colors.brand.gold }]}>{icon}</View>
      <ThemedText variant="label" color="secondary" style={{ marginTop: 6 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  conciergeSlot: { marginTop: 20 },
  contextStrip: { marginTop: 10 },
  askRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  askLabel: { marginLeft: 6 },
  tierCard: { marginTop: 20 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between' },
  segmentPill: { marginTop: 12 },
  actions: { flexDirection: 'row', marginTop: 24 },
  action: { alignItems: 'center', marginRight: 28 },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { marginTop: 28, marginBottom: 12 },
  carouselItem: { width: 260, marginRight: 12 },
});
