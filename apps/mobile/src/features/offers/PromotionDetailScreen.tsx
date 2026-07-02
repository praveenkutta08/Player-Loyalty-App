import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Card, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OffersStackParamList } from './types';

type Props = NativeStackScreenProps<OffersStackParamList, 'PromotionDetail'>;

/** O4 — promotion detail. Promotions are informational (no redeem), with details + terms. */
export function PromotionDetailScreen({ route }: Props): React.JSX.Element {
  const theme = useTheme();
  const { promotion } = route.params;
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <StatusPill label="promotion" tone="purple" />
        <ThemedText variant="h1" style={styles.title}>
          {promotion.title}
        </ThemedText>
        {promotion.description ? (
          <ThemedText variant="body" color="secondary">
            {promotion.description}
          </ThemedText>
        ) : null}
        {promotion.terms ? (
          <Card style={{ marginTop: theme.spacing.lg }}>
            <ThemedText variant="label" color="muted">
              Terms
            </ThemedText>
            <ThemedText variant="body" color="secondary" style={{ marginTop: 6 }}>
              {promotion.terms}
            </ThemedText>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
  title: { marginTop: 12, marginBottom: 8 },
});
