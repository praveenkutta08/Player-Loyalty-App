import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import uuid from 'react-native-uuid';

import { Button, Card, Screen, StatusPill, ThemedText } from '../../components';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { useTheme } from '../../theme/ThemeProvider';
import { errorMessage } from '../auth/errors';
import { markRedeemed } from './redeemedSlice';
import { useRedeemOfferMutation } from './offersApi';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OffersStackParamList } from './types';

type Props = NativeStackScreenProps<OffersStackParamList, 'OfferDetail'>;

/** O2 — offer detail + redeem. Redemption is idempotent (stable key per screen) and reflects state. */
export function OfferDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { offer } = route.params;
  const alreadyRedeemed = useAppSelector((s) => s.redeemed.offerIds.includes(offer.id));
  const [redeem, { isLoading, error }] = useRedeemOfferMutation();

  // Stable idempotency key for this redeem attempt so a retry never double-redeems (golden rule #4).
  const idempotencyKey = useMemo(() => String(uuid.v4()), []);

  const onRedeem = async (): Promise<void> => {
    try {
      const result = await redeem({ offerId: offer.id, idempotencyKey }).unwrap();
      dispatch(markRedeemed(offer.id));
      navigation.replace('RedemptionConfirmation', {
        title: offer.title,
        code: result.id.slice(0, 8).toUpperCase(),
      });
    } catch {
      // surfaced below
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <StatusPill label={offer.kind} tone="info" />
        <ThemedText variant="h1" style={styles.title}>
          {offer.title}
        </ThemedText>
        {offer.description ? (
          <ThemedText variant="body" color="secondary">
            {offer.description}
          </ThemedText>
        ) : null}

        {offer.terms ? (
          <Card style={styles.terms}>
            <ThemedText variant="label" color="muted">
              Terms
            </ThemedText>
            <ThemedText variant="body" color="secondary" style={{ marginTop: 6 }}>
              {offer.terms}
            </ThemedText>
          </Card>
        ) : null}

        {error ? (
          <ThemedText variant="label" style={{ color: theme.colors.state.error, marginTop: 16 }}>
            {errorMessage(error, 'Could not redeem this offer.')}
          </ThemedText>
        ) : null}

        <View style={styles.cta}>
          {alreadyRedeemed ? (
            <View style={styles.redeemedRow}>
              <StatusPill label="Redeemed" tone="success" />
            </View>
          ) : (
            <Button
              label="Redeem offer"
              onPress={onRedeem}
              loading={isLoading}
              testID="redeem"
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
  title: { marginTop: 12, marginBottom: 8 },
  terms: { marginTop: 24 },
  cta: { marginTop: 32 },
  redeemedRow: { alignItems: 'center' },
});
